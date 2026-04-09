import Companion from "../models/Companion.js";
import { RELATIONSHIP_TYPES, TONE_OPTIONS, BEHAVIOR_MODES } from "../../shared/constants/companionOptions.js";

const ALLOWED_MOODS = new Set([
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
]);

const ALLOWED_RELATIONSHIPS = new Set(RELATIONSHIP_TYPES);
const ALLOWED_TONES = new Set(TONE_OPTIONS);
const ALLOWED_BEHAVIORS = new Set(BEHAVIOR_MODES);

const normalizeCompanionPayload = (payload = {}) => {
    const normalized = { ...payload };

    if (Array.isArray(payload.moodModes)) {
        normalized.moodModes = [...new Set(
            payload.moodModes
                .map((item) => String(item || "").trim().toLowerCase())
                .filter((item) => ALLOWED_MOODS.has(item))
        )];
    }

    if (Array.isArray(payload.behaviorModes)) {
        normalized.behaviorModes = [...new Set(
            payload.behaviorModes
                .map((item) => String(item || "").trim().toLowerCase())
                .filter((item) => ALLOWED_BEHAVIORS.has(item))
        )];
    }

    if (Array.isArray(payload.toneModes)) {
        normalized.toneModes = [...new Set(
            payload.toneModes
                .map((item) => String(item || "").trim().toLowerCase())
                .filter(Boolean)
        )];
    }

    if (payload.tone) {
        const tone = String(payload.tone).trim().toLowerCase();
        normalized.tone = ALLOWED_TONES.has(tone) ? tone : "auto";
    }

    if (payload.relationshipType) {
        const relationshipType = String(payload.relationshipType).trim().toLowerCase();
        normalized.relationshipType = ALLOWED_RELATIONSHIPS.has(relationshipType) ? relationshipType : "other";
    }

    return normalized;
};

const DEFAULT_QUICK_COMPANIONS = [
    {
        name: "Sam",
        legacyNames: ["Sam"],
        gender: "male",
        relationshipType: "auto",
        tone: "auto",
        isAutoCompanion: true,
        moodModes: [],
        avatarSettings: {
            style: "anime",
            hairColor: "black",
            mood: "calm",
            accessory: "none",
            skinTone: "medium",
            outfit: "hoodie",
            avatarPrompt: "anime boy, black hair, serious expression, casual style"
        }
    },
    {
        name: "Eva",
        legacyNames: ["Eva"],
        gender: "female",
        relationshipType: "auto",
        tone: "auto",
        isAutoCompanion: true,
        moodModes: [],
        avatarSettings: {
            style: "anime",
            hairColor: "purple",
            mood: "calm",
            accessory: "none",
            skinTone: "medium",
            outfit: "casual",
            avatarPrompt: "anime girl, purple curly hair, calm smile, professional style, fantasy background"
        }
    }
];

const ensureDefaultQuickCompanions = async (userId) => {
    for (const preset of DEFAULT_QUICK_COMPANIONS) {
        const namesToMatch = [...new Set([preset.name, ...(preset.legacyNames || [])])];
        const matches = await Companion.find({
            userId,
            isAutoCompanion: true,
            name: { $in: namesToMatch },
            gender: preset.gender
        }).sort({ createdAt: 1 });

        if (matches.length === 0) {
            await Companion.create({ ...preset, userId });
            continue;
        }

        const keeper = matches[0];
        await Companion.updateOne(
            { _id: keeper._id, userId },
            {
                $set: {
                    name: preset.name,
                    relationshipType: "auto",
                    tone: "auto",
                    isAutoCompanion: true
                }
            }
        );

        if (matches.length > 1) {
            const duplicateIds = matches.slice(1).map((item) => item._id);
            await Companion.deleteMany({ _id: { $in: duplicateIds }, userId, isAutoCompanion: true });
        }
    }
};

export const listCompanions = async (req, res) => {
    try {
        await ensureDefaultQuickCompanions(req.user.id);
    } catch (error) {
        console.error("Quick companion upkeep failed during list:", error?.message || error);
    }

    const autoCompanions = await Companion.find({ userId: req.user.id, isAutoCompanion: true }).sort({ createdAt: 1 });
    const quickKeys = new Set();
    const duplicateIds = [];

    for (const companion of autoCompanions) {
        const key = `${companion.gender || "auto"}:${companion.name?.toLowerCase() || ""}`;
        if (quickKeys.has(key)) {
            duplicateIds.push(companion._id);
            continue;
        }
        quickKeys.add(key);
    }

    if (duplicateIds.length > 0) {
        await Companion.deleteMany({ _id: { $in: duplicateIds }, userId: req.user.id, isAutoCompanion: true });
    }

    const companions = await Companion.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(companions);
};

export const createCompanion = async (req, res) => {
    const payload = {
        ...normalizeCompanionPayload(req.body),
        userId: req.user.id
    };

    const companion = await Companion.create(payload);
    res.status(201).json(companion);
};

export const updateCompanion = async (req, res) => {
    const companion = await Companion.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        normalizeCompanionPayload(req.body),
        { new: true, runValidators: true }
    );

    if (!companion) {
        const error = new Error("Companion not found");
        error.status = 404;
        throw error;
    }

    res.json(companion);
};

export const deleteCompanion = async (req, res) => {
    const companion = await Companion.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!companion) {
        const error = new Error("Companion not found");
        error.status = 404;
        throw error;
    }

    res.status(204).send();
};
