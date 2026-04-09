import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";
import * as socialService from "../services/socialService.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// ==================== ROOM ROUTES ====================

// Create a new room
router.post("/rooms", asyncHandler(async (req, res) => {
    const { title, type, aiCompanionId } = req.body;
    const userId = req.user.id;

    if (!title || !type || !["chat", "voice", "video"].includes(type)) {
        return res.status(400).json({ error: "Invalid room data" });
    }

    const room = await socialService.createRoom(title, type, userId, aiCompanionId);
    res.status(201).json({ success: true, room });
}));

// List active rooms
router.get("/rooms", asyncHandler(async (req, res) => {
    const { type, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const result = await socialService.listActiveRooms(type, parseInt(limit), parseInt(skip));
    res.json(result);
}));

// Get room details
router.get("/rooms/:id", asyncHandler(async (req, res) => {
    const room = await socialService.getRoomById(req.params.id);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
}));

// Join a room
router.post("/rooms/:id/join", asyncHandler(async (req, res) => {
    const room = await socialService.joinRoom(req.params.id, req.user.id);
    res.json({ success: true, room });
}));

// Leave a room
router.post("/rooms/:id/leave", asyncHandler(async (req, res) => {
    const { room, deleted } = await socialService.leaveRoom(req.params.id, req.user.id);
    res.json({ success: true, room, deleted });
}));

// ==================== QUEUE ROUTES ====================

// Join match queue
router.post("/queue/join", asyncHandler(async (req, res) => {
    const { type, interests } = req.body;
    const userId = req.user.id;

    if (!type || !["chat", "voice", "video"].includes(type)) {
        return res.status(400).json({ error: "Invalid queue type" });
    }

    const result = await socialService.joinMatchQueue(userId, type, interests || []);
    res.status(201).json({ success: true, ...result });
}));

// Leave match queue
router.post("/queue/leave", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const left = await socialService.leaveMatchQueue(userId);
    res.json({ success: left });
}));

// Get queue status
router.get("/queue/status", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const status = await socialService.getQueueStatus(userId);
    res.json(status);
}));

// ==================== FRIEND ROUTES ====================

// Send friend request
router.post("/friends/:userId/add", asyncHandler(async (req, res) => {
    const fromUserId = req.user.id;
    const toUserId = req.params.userId;

    const request = await socialService.sendFriendRequest(fromUserId, toUserId);
    res.status(201).json({ success: true, request });
}));

// Accept friend request
router.post("/friends/:userId/accept", asyncHandler(async (req, res) => {
    const fromUserId = req.params.userId;
    const toUserId = req.user.id;

    const friendship = await socialService.acceptFriendRequest(fromUserId, toUserId);
    res.json({ success: true, friendship });
}));

// Get friends list
router.get("/friends", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const friends = await socialService.getFriends(userId);
    res.json(friends);
}));

// Get pending friend requests
router.get("/friends/pending", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const requests = await socialService.getPendingRequests(userId);
    res.json(requests);
}));

// Block user
router.post("/users/:userId/block", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const blockUserId = req.params.userId;
    const { reason } = req.body;

    const blocked = await socialService.blockUser(userId, blockUserId, reason);
    res.json({ success: true, blocked });
}));

// Report user
router.post("/users/:userId/report", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const reportedUserId = req.params.userId;
    const { reason } = req.body;

    const report = await socialService.reportUser(userId, reportedUserId, reason);
    res.json({ success: true, report });
}));

// Get blocked users
router.get("/users/blocked", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const blocked = await socialService.getBlockedUsers(userId);
    res.json(blocked);
}));

// ==================== PREFERENCE ROUTES ====================

// Get user preferences
router.get("/preferences", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const prefs = await socialService.getUserPreferences(userId);
    res.json(prefs);
}));

// Update user preferences
router.post("/preferences", asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updates = req.body;

    const prefs = await socialService.updateUserPreferences(userId, updates);
    res.json({ success: true, prefs });
}));

export default router;
