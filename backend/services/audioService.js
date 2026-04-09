import { getOpenAIClient } from "../ai/openaiClient.js";
import { getGeminiClient } from "../ai/geminiClient.js";
import fs from "fs";

const resolveTranscribeProvider = () => {
    const configuredProvider = String(process.env.AUDIO_TRANSCRIBE_PROVIDER || "").trim().toLowerCase();
    if (configuredProvider === "gemini" || configuredProvider === "openai") {
        return configuredProvider;
    }

    const openAiKey = String(process.env.OPENAI_API_KEY || "").trim();
    const geminiKey = String(process.env.GEMINI_API_KEY || "").trim();

    // Gemini API keys usually start with AIza; OpenAI keys should not.
    const hasUsableOpenAIKey = Boolean(openAiKey) && !openAiKey.startsWith("AIza");
    const hasGeminiKey = Boolean(geminiKey);

    if (hasGeminiKey && !hasUsableOpenAIKey) {
        return "gemini";
    }

    if (hasUsableOpenAIKey && !hasGeminiKey) {
        return "openai";
    }

    const chatProvider = String(process.env.CHAT_PROVIDER || "").trim().toLowerCase();
    if (chatProvider === "gemini" || chatProvider === "nim") {
        return "gemini";
    }

    return hasGeminiKey ? "gemini" : "openai";
};

const transcribeWithOpenAI = async (audioFilePath) => {
    const openai = getOpenAIClient();
    const audioStream = fs.createReadStream(audioFilePath);

    const transcript = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1"
    });

    return transcript.text;
};

const transcribeWithGemini = async (audioFilePath, mimeType, options = {}) => {
    const client = getGeminiClient();
    const modelName = process.env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = client.getGenerativeModel({ model: modelName });

    const bytes = fs.readFileSync(audioFilePath);
    const base64Audio = bytes.toString("base64");
    const mimeCandidates = [mimeType, "audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"]
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index);

    for (const candidateMime of mimeCandidates) {
        const result = await model.generateContent([
            {
                text: `Transcribe this audio accurately. Primary language code: ${options.speechLanguage || "unknown"}. Return only the spoken words as plain text with no labels and no markdown.`
            },
            {
                inlineData: {
                    mimeType: candidateMime,
                    data: base64Audio
                }
            }
        ]);

        const rawText = result.response.text()?.trim() || "";
        const text = rawText
            .replace(/^transcript\s*:\s*/i, "")
            .replace(/^"|"$/g, "")
            .trim();

        if (text) {
            return text;
        }
    }

    return "";
};

/**
 * Transcribe audio to text using configured provider (Gemini/OpenAI)
 */
export const transcribeAudio = async (audioFilePath, mimeType, options = {}) => {
    try {
        const provider = resolveTranscribeProvider();
        const text = provider === "openai"
            ? await transcribeWithOpenAI(audioFilePath)
            : await transcribeWithGemini(audioFilePath, mimeType, options);

        const hintText = String(options.liveTranscript || "").trim();
        const resolvedText = text || hintText;

        if (!resolvedText) {
            const error = new Error("Audio transcription returned empty text");
            error.status = 422;
            throw error;
        }

        return { text: resolvedText };
    } catch (error) {
        const err = new Error(`Audio transcription failed: ${error.message}`);
        err.status = error.status || 500;
        throw err;
    }
};

/**
 * Convert text to speech using a simple browser-compatible format
 * Note: For production, integrate with TTS services like:
 * - Google Cloud Text-to-Speech
 * - Azure Text-to-Speech
 * - ElevenLabs API
 *
 * For now, we return the text as-is and let the frontend handle TTS
 */
export const textToSpeech = async (text) => {
    try {
        // Return metadata that frontend can use for browser TTS
        return {
            text,
            method: "browser-tts", // Frontend will use Web Speech API
            timestamp: new Date()
        };
    } catch (error) {
        const err = new Error(`Text-to-speech failed: ${error.message}`);
        err.status = 500;
        throw err;
    }
};

/**
 * Clean up temporary audio files
 */
export const cleanupAudioFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(`Failed to cleanup audio file: ${error.message}`);
    }
};
