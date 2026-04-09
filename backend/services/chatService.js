import Companion from "../models/Companion.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { buildPrompt } from "../ai/promptBuilder.js";
import { getOpenAIClient } from "../ai/openaiClient.js";
import { chatWithGemini } from "../ai/geminiClient.js";
import { isUnsafeText } from "../utils/safety.js";

const runOpenAIChat = async ({ systemPrompt, history, message }) => {
    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const response = await openai.chat.completions.create({
        model,
        temperature: 0.8,
        messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ]
    });

    return response.choices?.[0]?.message?.content?.trim() || "I am here with you.";
};

const isGeminiQuotaError = (error) => {
    const text = String(error?.message || "").toLowerCase();
    return text.includes("429") || text.includes("quota") || text.includes("too many requests");
};

const hasLikelyOpenAIKey = () => {
    const key = String(process.env.OPENAI_API_KEY || "").trim();
    if (!key) {
        return false;
    }

    // Gemini keys usually start with AIza; avoid sending those to OpenAI.
    if (key.startsWith("AIza")) {
        return false;
    }

    return true;
};

const canUseOpenAIFallback = () => {
    return process.env.GEMINI_FALLBACK_TO_OPENAI !== "false" && hasLikelyOpenAIKey();
};

export const runChat = async ({ userId, companionId, message }) => {
    if (isUnsafeText(message)) {
        return { reply: "I cannot help with that request. Let us switch to something safe and productive." };
    }

    const companion = await Companion.findOne({ _id: companionId, userId });
    if (!companion) {
        const error = new Error("Companion not found");
        error.status = 404;
        throw error;
    }

    let chat = await Chat.findOne({ userId, companionId });
    if (!chat) {
        chat = await Chat.create({ userId, companionId, messages: [] });
    }

    const history = chat.messages.slice(-8).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));
    const userProfile = await User.findById(userId).select("name gender age nationality").lean();
    const systemPrompt = buildPrompt(companion, history, userProfile);

    const provider = process.env.CHAT_PROVIDER || "openai";
    let reply;

    if (provider === "gemini" || provider === "nim") {
        try {
            const result = await chatWithGemini(
                [
                    { role: "system", content: systemPrompt },
                    ...history,
                    { role: "user", content: message }
                ],
                systemPrompt
            );
            reply = result.reply;
        } catch (error) {
            console.error("Gemini API error:", error);

            const shouldFallback = canUseOpenAIFallback();

            if (shouldFallback) {
                try {
                    reply = await runOpenAIChat({ systemPrompt, history, message });
                } catch (fallbackError) {
                    console.error("OpenAI fallback error:", fallbackError);
                    reply = "I am having trouble reaching my AI provider right now, but I am still here with you. Please try your message again in a moment.";
                }
            } else {
                // Keep chat/voice usable instead of hard-failing when Gemini is down.
                reply = isGeminiQuotaError(error)
                    ? "Gemini quota is currently exhausted. I can still continue with lightweight responses while the service recovers."
                    : "Gemini is temporarily unavailable. I can still help with lightweight responses while this recovers.";
            }
        }
    } else {
        reply = await runOpenAIChat({ systemPrompt, history, message });
    }

    chat.messages.push({ role: "user", content: message, timestamp: new Date() });
    chat.messages.push({ role: "ai", content: reply, timestamp: new Date() });
    await chat.save();

    return { reply, companion };
};
