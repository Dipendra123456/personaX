export const AVATAR_STYLES = [
    "anime",
    "realistic",
    "cartoon",
    "cyberpunk",
    "fantasy",
    "minimal"
];

export const AVATAR_HAIR_COLORS = ["black", "brown", "blonde", "red", "white", "blue", "pink"];

export const AVATAR_MOODS = ["calm", "smile", "serious", "playful", "confident", "mysterious"];

export const AVATAR_ACCESSORIES = ["none", "glasses", "headphones", "hat", "earrings", "hoodie"];

const AVATAR_STYLE_TO_COLLECTION = {
    anime: "lorelei-neutral",
    realistic: "micah",
    cartoon: "avataaars-neutral",
    cyberpunk: "bottts-neutral",
    fantasy: "adventurer-neutral",
    minimal: "personas"
};

export const buildAvatarPrompt = (avatarSettings = {}) => {
    const style = avatarSettings.style || "anime";
    const hairColor = avatarSettings.hairColor || "brown";
    const mood = avatarSettings.mood || "calm";
    const accessory = avatarSettings.accessory || "none";
    const skinTone = avatarSettings.skinTone || "medium";
    const outfit = avatarSettings.outfit || "casual";
    const gender = avatarSettings.gender || "unspecified gender";

    return `Create a ${style} AI companion avatar portrait for a ${gender} companion with ${hairColor} hair, ${skinTone} skin tone, a ${mood} expression, wearing ${outfit} clothing, with ${accessory} as an accessory. Clean background, high detail, centered composition, social media avatar style.`;
};

export const buildAvatarImageUrl = (avatarSettings = {}, seed = "personax") => {
    const style = avatarSettings.style || "anime";
    const collection = AVATAR_STYLE_TO_COLLECTION[style] || AVATAR_STYLE_TO_COLLECTION.anime;
    const avatarSeed = [
        seed,
        style,
        avatarSettings.hairColor || "brown",
        avatarSettings.mood || "calm",
        avatarSettings.accessory || "none"
    ].join("-");

    const params = new URLSearchParams({
        seed: avatarSeed,
        backgroundColor: "d1f2eb",
        radius: "50"
    });

    return `https://api.dicebear.com/9.x/${collection}/svg?${params.toString()}`;
};

