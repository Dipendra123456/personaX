import { runChat } from "../services/chatService.js";
import { transcribeAudio, cleanupAudioFile, textToSpeech } from "../services/audioService.js";

/**
 * Handle voice chat: transcribe audio → send to chat → return text response + TTS metadata
 */
export const voiceChatWithCompanion = async (req, res) => {
    const { companionId, liveTranscript = "", speechLanguage = "" } = req.body;

    if (!req.file) {
        const error = new Error("No audio file provided");
        error.status = 400;
        throw error;
    }

    const audioFilePath = req.file.path;

    try {
        // Transcribe audio to text
        const { text: userMessage } = await transcribeAudio(audioFilePath, req.file.mimetype, {
            liveTranscript,
            speechLanguage
        });

        // Send transcribed message to companion
        const { reply } = await runChat({
            userId: req.user.id,
            companionId,
            message: userMessage
        });

        // Convert response to speech metadata
        const audioResponse = await textToSpeech(reply);

        // Return both transcribed message and AI reply
        res.json({
            userMessage,
            reply,
            audioResponse
        });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    } finally {
        // Clean up temporary audio file
        cleanupAudioFile(audioFilePath);
    }
};

/**
 * Generate speech from text
 * Frontend will use browser Web Speech API or request this endpoint for server-side TTS
 */
export const generateSpeech = async (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim()) {
        const error = new Error("Text is required for speech generation");
        error.status = 400;
        throw error;
    }

    try {
        const audioResponse = await textToSpeech(text);
        res.json(audioResponse);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
