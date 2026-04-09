import mongoose from "mongoose";

const matchQueueSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true // One user can only be in queue once
        },
        type: {
            type: String,
            enum: ["chat", "voice", "video"],
            required: true
        },
        interests: [String], // Optional: user interests for better matching
        status: {
            type: String,
            enum: ["waiting", "matched"],
            default: "waiting"
        },
        matchedRoomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room"
        },
        matchedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        joinedAt: { type: Date, default: Date.now },
        timeoutAt: {
            type: Date,
            default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 min timeout
        }
    },
    { timestamps: true }
);

// Auto-remove expired entries
matchQueueSchema.index({ timeoutAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("MatchQueue", matchQueueSchema);
