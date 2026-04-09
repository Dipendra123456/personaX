import mongoose from "mongoose";
import { BEHAVIOR_MODES, MOOD_MODES, RELATIONSHIP_TYPES, TONE_OPTIONS, GENDER_OPTIONS } from "../../shared/constants/companionOptions.js";

const MOOD_ENUM_SAFE = Array.from(new Set([
    ...MOOD_MODES,
    "supportive",
    "playful",
    "calm",
    "motivational",
    "roast",
    "romantic",
    "savage",
    "caring",
    "chaotic",
    "analytical"
]));

const personalitySchema = new mongoose.Schema(
    {
        humorLevel: { type: Number, default: 50, min: 0, max: 100 },
        aggressionLevel: { type: Number, default: 20, min: 0, max: 100 },
        emotionalLevel: { type: Number, default: 60, min: 0, max: 100 },
        dominanceLevel: { type: Number, default: 40, min: 0, max: 100 }
    },
    { _id: false }
);

const memoryEntrySchema = new mongoose.Schema(
    {
        content: { type: String, required: true },
        importance: { type: Number, default: 1, min: 1, max: 5 }
    },
    { timestamps: true }
);

const avatarSettingsSchema = new mongoose.Schema(
    {
        style: { type: String, default: "anime" },
        hairColor: { type: String, default: "brown" },
        mood: { type: String, default: "calm" },
        accessory: { type: String, default: "none" },
        skinTone: { type: String, default: "medium" },
        outfit: { type: String, default: "casual" },
        avatarPrompt: { type: String, default: "" },
        avatarImageData: { type: String, default: "" },
        avatarImageMimeType: { type: String, default: "image/png" }
    },
    { _id: false }
);

const companionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        avatar: { type: String, default: "" },
        gender: { type: String, enum: GENDER_OPTIONS, default: "auto" },
        relationshipType: {
            type: String,
            enum: RELATIONSHIP_TYPES,
            default: "auto"
        },
        isAutoCompanion: { type: Boolean, default: true },
        customAvatarUrl: { type: String, default: "" },
        avatarSettings: { type: avatarSettingsSchema, default: () => ({}) },
        personality: { type: personalitySchema, default: () => ({}) },
        moodModes: [{ type: String, enum: MOOD_ENUM_SAFE }],
        behaviorModes: [{ type: String, enum: BEHAVIOR_MODES }],
        tone: { type: String, enum: TONE_OPTIONS, default: "auto" },
        memory: { type: [memoryEntrySchema], default: [] }
    },
    { timestamps: true }
);

export default mongoose.model("Companion", companionSchema);
