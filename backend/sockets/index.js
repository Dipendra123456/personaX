import { Server } from "socket.io";

// Store active user connections: userId -> socketId
const activeUsers = new Map();

export const registerSocketServer = (httpServer, corsOrigin) => {
    const io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        // ==================== AUTHENTICATION ====================
        socket.on("user:connect", ({ userId }) => {
            activeUsers.set(userId, socket.id);
            // Join personal room for targeted notifications
            socket.join(`user:${userId}`);
            console.log(`User ${userId} connected on socket ${socket.id}`);
        });

        // ==================== LEGACY GAME/CHAT EVENTS ====================
        socket.on("joinRoom", (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit("system", { message: "A user joined the room" });
        });

        socket.on("chat", ({ roomId, message, user }) => {
            io.to(roomId).emit("chat", { user, message, timestamp: Date.now() });
        });

        socket.on("move", ({ roomId, move }) => {
            socket.to(roomId).emit("move", move);
        });

        // ==================== SOCIAL ROOM EVENTS ====================
        socket.on("user:joined-room", ({ roomId, userId, userName, identity }) => {
            socket.join(roomId);
            socket.to(roomId).emit("user:joined-room", {
                userId,
                userName,
                identity,
                joinedAt: Date.now()
            });
        });

        socket.on("user:left-room", ({ roomId, userId }) => {
            socket.leave(roomId);
            socket.to(roomId).emit("user:left-room", {
                userId,
                leftAt: Date.now()
            });
        });

        socket.on("room:updated", ({ roomId, data }) => {
            io.to(roomId).emit("room:updated", data);
        });

        // ==================== FRIEND EVENTS ====================
        socket.on("friend:request-sent", ({ toUserId, fromUserName }) => {
            const toSocketId = activeUsers.get(toUserId);
            if (toSocketId) {
                io.to(`user:${toUserId}`).emit("friend:request-received", {
                    fromUserName,
                    createdAt: Date.now()
                });
            }
        });

        socket.on("friend:accepted", ({ toUserId, fromUserName }) => {
            const toSocketId = activeUsers.get(toUserId);
            if (toSocketId) {
                io.to(`user:${toUserId}`).emit("friend:accepted", {
                    fromUserName,
                    acceptedAt: Date.now()
                });
            }
        });

        // ==================== MUTE/CONTROL EVENTS ====================
        socket.on("mute:user", ({ roomId, mutedUserId }) => {
            io.to(roomId).emit("mute:user", {
                mutedUserId,
                mutedAt: Date.now()
            });
        });

        socket.on("unmute:user", ({ roomId, unmutedUserId }) => {
            io.to(roomId).emit("unmute:user", {
                unmutedUserId,
                unmutedAt: Date.now()
            });
        });

        // ==================== WEBRTC SIGNALING ====================
        socket.on("webrtc:offer", ({ roomId, to, offer }) => {
            io.to(roomId).emit("webrtc:offer", {
                from: socket.id,
                offer,
                roomId
            });
        });

        socket.on("webrtc:answer", ({ roomId, to, answer }) => {
            io.to(roomId).emit("webrtc:answer", {
                from: socket.id,
                answer,
                roomId
            });
        });

        socket.on("webrtc:ice-candidate", ({ roomId, candidate }) => {
            io.to(roomId).emit("webrtc:ice-candidate", {
                from: socket.id,
                candidate,
                roomId
            });
        });

        // ==================== DISCONNECT ====================
        socket.on("disconnect", () => {
            // Remove user from active users map
            for (const [userId, socketId] of activeUsers.entries()) {
                if (socketId === socket.id) {
                    activeUsers.delete(userId);
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
            socket.broadcast.emit("system", { message: "A user disconnected" });
        });
    });

    return io;
};
