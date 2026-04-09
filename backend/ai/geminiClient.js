import { GoogleGenerativeAI } from "@google/generative-ai";

let client;

export const getGeminiClient = () => {
    if (client) {
        return client;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    client = new GoogleGenerativeAI(apiKey);
    return client;
};

/**
 * Chat with Gemini model
 * Converts OpenAI message format to Gemini format
 */
export const chatWithGemini = async (messages, systemPrompt) => {
    const client = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = client.getGenerativeModel({ model: modelName });

    // Keep only non-system turns in history and map assistant -> model.
    const nonSystemMessages = messages.filter((msg) => msg.role !== "system");
    const latest = nonSystemMessages[nonSystemMessages.length - 1];
    const historyMessages = nonSystemMessages.slice(0, -1);

    const conversationHistory = historyMessages.map((msg) => ({
        role: msg.role === "assistant" || msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        history: conversationHistory
    });

    const userText = latest?.content?.trim();
    if (!userText) {
        throw new Error("No user message provided for Gemini chat");
    }

    const result = await chat.sendMessage(userText);
    const reply = result.response.text();

    return { reply };
};
