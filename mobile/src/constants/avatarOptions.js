export const AVATAR_STYLES = ["anime", "realistic", "cartoon", "cyberpunk", "fantasy", "minimal"];

export const AVATAR_HAIR_COLORS = ["black", "brown", "blonde", "red", "white", "blue", "pink"];

export const AVATAR_MOODS = ["calm", "smile", "serious", "playful", "confident", "mysterious"];

export const AVATAR_ACCESSORIES = ["none", "glasses", "headphones", "hat", "earrings", "hoodie"];

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
