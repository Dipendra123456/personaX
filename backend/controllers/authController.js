import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Companion from "../models/Companion.js";
import { createToken } from "../utils/auth.js";

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const normalizeText = (value = "", fallback = "unspecified") => {
    const normalized = String(value || "").trim();
    return normalized || fallback;
};

const toPublicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    gender: user.gender || "unspecified",
    age: user.age,
    nationality: user.nationality || "unspecified",
    socialLinks: {
        linkedin: user.socialLinks?.linkedin || "",
        instagram: user.socialLinks?.instagram || "",
        snapchat: user.socialLinks?.snapchat || ""
    }
});

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

export const register = async (req, res) => {
    const { name, password, age } = req.body;
    const email = normalizeEmail(req.body.email);
    const gender = normalizeText(req.body.gender);
    const nationality = normalizeText(req.body.nationality);

    const existing = await User.findOne({ email });
    if (existing) {
        const error = new Error("Email already in use");
        error.status = 409;
        throw error;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, gender, age, nationality });
    try {
        await ensureDefaultQuickCompanions(user._id);
    } catch (error) {
        console.error("Quick companion setup failed during register:", error?.message || error);
    }

    const token = createToken({ id: user._id, email: user.email });
    res.status(201).json({ token, user: toPublicUser(user) });
};

export const login = async (req, res) => {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    if (!user) {
        const error = new Error("Invalid credentials");
        error.status = 401;
        throw error;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        const error = new Error("Invalid credentials");
        error.status = 401;
        throw error;
    }

    try {
        await ensureDefaultQuickCompanions(user._id);
    } catch (error) {
        console.error("Quick companion setup failed during login:", error?.message || error);
    }

    const token = createToken({ id: user._id, email: user.email });
    res.json({ token, user: toPublicUser(user) });
};

export const me = async (req, res) => {
    const user = await User.findById(req.user.id).select("_id name email gender age nationality socialLinks");

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    res.json({ user: toPublicUser(user) });
};

export const updateProfile = async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    if (typeof req.body.name === "string") {
        user.name = req.body.name.trim();
    }

    if (typeof req.body.gender === "string") {
        user.gender = normalizeText(req.body.gender);
    }

    if (typeof req.body.age === "number") {
        user.age = req.body.age;
    }

    if (typeof req.body.nationality === "string") {
        user.nationality = normalizeText(req.body.nationality);
    }

    if (req.body.socialLinks && typeof req.body.socialLinks === "object") {
        user.socialLinks = {
            linkedin: String(req.body.socialLinks.linkedin || "").trim(),
            instagram: String(req.body.socialLinks.instagram || "").trim(),
            snapchat: String(req.body.socialLinks.snapchat || "").trim()
        };
    }

    await user.save();

    res.json({ user: toPublicUser(user) });
};
