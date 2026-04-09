import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        identity: {
            type: String,
            enum: ["profile", "anonymous", "aiAvatar"],
            default: "profile"
        },
        selectedCompanionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Companion"
        },
        voiceChatEnabled: { type: Boolean, default: true },
        strangerChatEnabled: { type: Boolean, default: true },
        teamMatchmaking: { type: Boolean, default: false },
        aiCompanionAllowed: { type: Boolean, default: true },
        blockedUsers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                blockedAt: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
);

export default mongoose.model("UserPreference", userPreferenceSchema);
