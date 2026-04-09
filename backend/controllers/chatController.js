import { runChat } from "../services/chatService.js";
import Chat from "../models/Chat.js";

export const chatWithCompanion = async (req, res) => {
    const { message, companionId } = req.body;
    const result = await runChat({ userId: req.user.id, companionId, message });
    res.json(result);
};

export const getChatHistory = async (req, res) => {
    const { companionId } = req.params;

    const chat = await Chat.findOne({ userId: req.user.id, companionId }).select("messages");
    const messages = (chat?.messages || []).map((entry) => ({
        role: entry.role,
        content: entry.content,
        timestamp: entry.timestamp
    }));

    res.json({ messages });
};
