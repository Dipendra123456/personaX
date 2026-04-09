import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { voiceChatWithCompanion, generateSpeech } from "../controllers/audioController.js";
import { requireAuth } from "../utils/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for audio uploads
const uploadDir = path.join(__dirname, "../tmp");
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
    fileFilter: (req, file, cb) => {
        // Accept common audio formats
        const allowedMimes = [
            "audio/wav",
            "audio/mpeg",
            "audio/mp4",
            "audio/webm",
            "audio/ogg",
            "application/octet-stream"
        ];

        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new Error("Invalid audio format. Please use WAV, MP3, MP4, WebM, or OGG."));
        }
    }
});

const router = express.Router();

/**
 * POST /api/audio/voice-chat
 * Send audio message, get transcription + AI response + audio metadata
 * 
 * Request: multipart/form-data with audio file
 * Response: { userMessage, reply, audioResponse }
 */
router.post(
    "/voice-chat",
    requireAuth,
    upload.single("audio"),
    asyncHandler(voiceChatWithCompanion)
);

/**
 * POST /api/audio/speak
 * Convert text to speech metadata (frontend uses Web Speech API)
 * 
 * Request: { text: string }
 * Response: { text, method, timestamp }
 */
router.post("/speak", requireAuth, asyncHandler(generateSpeech));

export default router;
