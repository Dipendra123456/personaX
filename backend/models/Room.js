import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["chat", "voice", "video"],
            required: true
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        users: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                joinedAt: { type: Date, default: Date.now },
                identity: {
                    type: String,
                    enum: ["profile", "anonymous", "aiAvatar"],
                    default: "profile"
                }
            }
        ],
        isActive: { type: Boolean, default: true },
        maxUsers: { type: Number, default: null }, // null = unlimited
        aiCompanionEnabled: { type: Boolean, default: false },
        aiCompanionId: { type: mongoose.Schema.Types.ObjectId, ref: "Companion" }, // if AI is in room
    },
    { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
