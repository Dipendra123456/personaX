import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "blocked"],
            default: "pending"
        },
        blockReason: String, // Optional: why user was blocked
        reportReason: String, // Optional: report reason if user reported
        reportResolved: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Ensure no duplicate relationships
friendSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

export default mongoose.model("Friend", friendSchema);
