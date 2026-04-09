import Room from "../models/Room.js";
import MatchQueue from "../models/MatchQueue.js";
import Friend from "../models/Friend.js";
import UserPreference from "../models/UserPreference.js";
import User from "../models/User.js";

// ==================== ROOM OPERATIONS ====================

export const createRoom = async (title, type, creatorId, aiCompanionId = null) => {
    try {
        const room = new Room({
            title,
            type,
            creator: creatorId,
            users: [{ userId: creatorId }],
            aiCompanionEnabled: !!aiCompanionId,
            aiCompanionId: aiCompanionId
        });
        await room.save();
        return room;
    } catch (error) {
        throw new Error(`Failed to create room: ${error.message}`);
    }
};

export const joinRoom = async (roomId, userId) => {
    try {
        const room = await Room.findByIdAndUpdate(
            roomId,
            { $push: { users: { userId } } },
            { new: true }
        ).populate("users.userId", "name email")
            .populate("creator", "name");

        if (!room) throw new Error("Room not found");
        return room;
    } catch (error) {
        throw new Error(`Failed to join room: ${error.message}`);
    }
};

export const leaveRoom = async (roomId, userId) => {
    try {
        const room = await Room.findByIdAndUpdate(
            roomId,
            { $pull: { users: { userId } } },
            { new: true }
        );

        if (!room) throw new Error("Room not found");

        // Auto-delete room if empty
        if (room.users.length === 0) {
            await Room.findByIdAndDelete(roomId);
            return { room: null, deleted: true };
        }

        return { room, deleted: false };
    } catch (error) {
        throw new Error(`Failed to leave room: ${error.message}`);
    }
};

export const getRoomById = async (roomId) => {
    try {
        const room = await Room.findById(roomId)
            .populate("users.userId", "name email")
            .populate("creator", "name");
        return room;
    } catch (error) {
        throw new Error(`Failed to fetch room: ${error.message}`);
    }
};

export const listActiveRooms = async (type = null, limit = 20, skip = 0) => {
    try {
        const query = { isActive: true };
        if (type) query.type = type;

        const rooms = await Room.find(query)
            .select("title type createdAt users aiCompanionEnabled")
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate("users.userId", "name");

        const total = await Room.countDocuments(query);

        return {
            rooms: rooms.map(room => ({
                id: room._id,
                title: room.title,
                type: room.type,
                userCount: room.users.length,
                users: room.users.map(u => ({ name: u.userId.name })),
                createdAt: room.createdAt,
                hasAI: room.aiCompanionEnabled
            })),
            total,
            page: Math.floor(skip / limit) + 1
        };
    } catch (error) {
        throw new Error(`Failed to list rooms: ${error.message}`);
    }
};

// ==================== QUEUE OPERATIONS ====================

export const joinMatchQueue = async (userId, type, interests = []) => {
    try {
        // Remove user from queue if already exists
        await MatchQueue.deleteOne({ userId });

        const queueEntry = new MatchQueue({
            userId,
            type,
            interests
        });
        await queueEntry.save();

        // Get queue position
        const position = await MatchQueue.countDocuments({
            type,
            status: "waiting",
            createdAt: { $lte: queueEntry.createdAt }
        });

        return {
            entryId: queueEntry._id,
            position,
            type
        };
    } catch (error) {
        throw new Error(`Failed to join queue: ${error.message}`);
    }
};

export const leaveMatchQueue = async (userId) => {
    try {
        const result = await MatchQueue.findOneAndDelete({ userId });
        return result ? true : false;
    } catch (error) {
        throw new Error(`Failed to leave queue: ${error.message}`);
    }
};

export const getQueueStatus = async (userId) => {
    try {
        const entry = await MatchQueue.findOne({ userId });

        if (!entry) return null;

        const position = await MatchQueue.countDocuments({
            type: entry.type,
            status: "waiting",
            createdAt: { $lte: entry.createdAt }
        });

        return {
            status: entry.status,
            position,
            type: entry.type,
            matchedRoomId: entry.matchedRoomId,
            joinedAt: entry.joinedAt,
            timeoutAt: entry.timeoutAt
        };
    } catch (error) {
        throw new Error(`Failed to get queue status: ${error.message}`);
    }
};

// ==================== QUEUE WORKER (RUN PERIODICALLY) ====================

export const matchQueueWorker = async (io) => {
    try {
        // Get all waiting entries grouped by type
        const queueByType = {
            chat: await MatchQueue.find({ type: "chat", status: "waiting" }),
            voice: await MatchQueue.find({ type: "voice", status: "waiting" }),
            video: await MatchQueue.find({ type: "video", status: "waiting" })
        };

        // Process each type
        for (const [type, entries] of Object.entries(queueByType)) {
            while (entries.length >= 2) {
                const user1Entry = entries.shift();
                const user2Entry = entries.shift();

                try {
                    // Create room for the pair
                    const room = await createRoom(
                        `${type === "chat" ? "Chat" : type === "voice" ? "Voice" : "Video"} Room`,
                        type,
                        user1Entry.userId
                    );

                    // Add second user to room
                    await joinRoom(room._id, user2Entry.userId);

                    // Update queue entries
                    user1Entry.status = "matched";
                    user1Entry.matchedRoomId = room._id;
                    user1Entry.matchedUserId = user2Entry.userId;
                    await user1Entry.save();

                    user2Entry.status = "matched";
                    user2Entry.matchedRoomId = room._id;
                    user2Entry.matchedUserId = user1Entry.userId;
                    await user2Entry.save();

                    // Emit socket event to both users
                    const user1 = await User.findById(user1Entry.userId);
                    const user2 = await User.findById(user2Entry.userId);

                    io.to(`user:${user1Entry.userId}`).emit("match:found", {
                        roomId: room._id.toString(),
                        roomTitle: room.title,
                        roomType: type,
                        matchedUser: {
                            id: user2._id.toString(),
                            name: user2.name
                        }
                    });

                    io.to(`user:${user2Entry.userId}`).emit("match:found", {
                        roomId: room._id.toString(),
                        roomTitle: room.title,
                        roomType: type,
                        matchedUser: {
                            id: user1._id.toString(),
                            name: user1.name
                        }
                    });
                } catch (matchError) {
                    console.error(`Failed to create match: ${matchError.message}`);
                }
            }
        }
    } catch (error) {
        console.error(`Queue worker error: ${error.message}`);
    }
};

// ==================== FRIEND OPERATIONS ====================

export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        if (fromUserId.toString() === toUserId.toString()) {
            throw new Error("Cannot send friend request to yourself");
        }

        // Check if already friends or pending
        const existing = await Friend.findOne({
            $or: [
                { fromUser: fromUserId, toUser: toUserId },
                { fromUser: toUserId, toUser: fromUserId }
            ]
        });

        if (existing) {
            throw new Error(`Relationship already exists with status: ${existing.status}`);
        }

        const friendRequest = new Friend({
            fromUser: fromUserId,
            toUser: toUserId,
            status: "pending"
        });

        await friendRequest.save();
        return friendRequest;
    } catch (error) {
        throw new Error(`Failed to send friend request: ${error.message}`);
    }
};

export const acceptFriendRequest = async (fromUserId, toUserId) => {
    try {
        const friendRequest = await Friend.findOneAndUpdate(
            { fromUser: fromUserId, toUser: toUserId, status: "pending" },
            { status: "accepted" },
            { new: true }
        );

        if (!friendRequest) {
            throw new Error("Friend request not found or already accepted");
        }

        return friendRequest;
    } catch (error) {
        throw new Error(`Failed to accept friend request: ${error.message}`);
    }
};

export const getFriends = async (userId) => {
    try {
        const friends = await Friend.find({
            $or: [
                { fromUser: userId, status: "accepted" },
                { toUser: userId, status: "accepted" }
            ]
        })
            .populate("fromUser", "name email")
            .populate("toUser", "name email");

        return friends.map(friend => ({
            id: friend._id,
            friend: friend.fromUser._id.toString() === userId.toString() ? friend.toUser : friend.fromUser,
            status: friend.status,
            since: friend.createdAt
        }));
    } catch (error) {
        throw new Error(`Failed to get friends: ${error.message}`);
    }
};

export const getPendingRequests = async (userId) => {
    try {
        const requests = await Friend.find({
            toUser: userId,
            status: "pending"
        }).populate("fromUser", "name email");

        return requests.map(req => ({
            id: req._id,
            from: req.fromUser,
            createdAt: req.createdAt
        }));
    } catch (error) {
        throw new Error(`Failed to get pending requests: ${error.message}`);
    }
};

export const blockUser = async (userId, blockUserId, reason = "") => {
    try {
        // Delete any existing friendship
        await Friend.deleteMany({
            $or: [
                { fromUser: userId, toUser: blockUserId },
                { fromUser: blockUserId, toUser: userId }
            ]
        });

        // Create block relationship
        const blockRelation = await Friend.findOneAndUpdate(
            { fromUser: userId, toUser: blockUserId },
            { status: "blocked", blockReason: reason },
            { upsert: true, new: true }
        );

        return blockRelation;
    } catch (error) {
        throw new Error(`Failed to block user: ${error.message}`);
    }
};

export const reportUser = async (userId, reportedUserId, reason = "") => {
    try {
        const report = await Friend.findOneAndUpdate(
            { fromUser: userId, toUser: reportedUserId },
            {
                status: "blocked",
                reportReason: reason,
                reportResolved: false
            },
            { upsert: true, new: true }
        );

        return report;
    } catch (error) {
        throw new Error(`Failed to report user: ${error.message}`);
    }
};

export const getBlockedUsers = async (userId) => {
    try {
        const blocked = await Friend.find({
            fromUser: userId,
            status: "blocked"
        }).populate("toUser", "name email");

        return blocked.map(b => ({
            id: b.toUser._id,
            user: b.toUser,
            reason: b.blockReason,
            blockedAt: b.createdAt
        }));
    } catch (error) {
        throw new Error(`Failed to get blocked users: ${error.message}`);
    }
};

// ==================== USER PREFERENCE OPERATIONS ====================

export const getUserPreferences = async (userId) => {
    try {
        let prefs = await UserPreference.findOne({ userId })
            .populate("selectedCompanionId", "name personality");

        if (!prefs) {
            // Create default preferences
            prefs = new UserPreference({ userId });
            await prefs.save();
        }

        return prefs;
    } catch (error) {
        throw new Error(`Failed to get preferences: ${error.message}`);
    }
};

export const updateUserPreferences = async (userId, updates) => {
    try {
        const prefs = await UserPreference.findOneAndUpdate(
            { userId },
            updates,
            { new: true, upsert: true }
        ).populate("selectedCompanionId", "name personality");

        return prefs;
    } catch (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
    }
};

export const addBlockedUser = async (userId, blockedUserId) => {
    try {
        const prefs = await UserPreference.findOneAndUpdate(
            { userId },
            {
                $addToSet: {
                    blockedUsers: { userId: blockedUserId }
                }
            },
            { new: true, upsert: true }
        );

        return prefs;
    } catch (error) {
        throw new Error(`Failed to add blocked user: ${error.message}`);
    }
};

export const removeBlockedUser = async (userId, blockedUserId) => {
    try {
        const prefs = await UserPreference.findOneAndUpdate(
            { userId },
            {
                $pull: {
                    blockedUsers: { userId: blockedUserId }
                }
            },
            { new: true }
        );

        return prefs;
    } catch (error) {
        throw new Error(`Failed to remove blocked user: ${error.message}`);
    }
};
