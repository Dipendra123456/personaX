import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ["user", "ai"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    },
    { _id: false }
);

const chatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        companionId: { type: mongoose.Schema.Types.ObjectId, ref: "Companion", required: true, index: true },
        messages: { type: [messageSchema], default: [] }
    },
    { timestamps: true }
);

chatSchema.index({ userId: 1, companionId: 1 }, { unique: true });

export default mongoose.model("Chat", chatSchema);
