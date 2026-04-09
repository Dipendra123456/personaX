import mongoose from "mongoose";

const gameSessionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        companionId: { type: mongoose.Schema.Types.ObjectId, ref: "Companion", required: true, index: true },
        gameType: { type: String, enum: ["chess", "sudoku", "othello", "memory"], required: true },
        difficulty: { type: String, enum: ["easy", "medium", "hard", "expert", "master"], default: "medium" },
        state: { type: mongoose.Schema.Types.Mixed, default: {} },
        status: { type: String, enum: ["active", "finished"], default: "active" }
    },
    { timestamps: true }
);

export default mongoose.model("GameSession", gameSessionSchema);
