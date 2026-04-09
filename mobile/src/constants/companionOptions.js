export const MOOD_MODES = [
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
];

export const TONE_OPTIONS = ["soft", "casual", "confident", "flirty", "bold", "sarcastic", "witty", "intellectual", "dramatic", "playful"];

export const GENDER_OPTIONS = ["auto", "male", "female", "non-binary", "other"];

export const BEHAVIOR_MODES = ["talkative", "listener", "reactive", "proactive", "challenger", "supporter", "teacher", "observer", "entertainer", "planner"];

export const RELATIONSHIP_GROUPS = [
    { label: "friend", value: "friend" },
    { label: "mentor", value: "mentor" },
    { label: "romantic partner", value: "romantic-partner", subOptions: ["boyfriend", "girlfriend", "husband", "wife"] },
    { label: "sibling", value: "sibling", subOptions: ["brother", "sister"] },
    { label: "parent", value: "parent", subOptions: ["mother", "father", "uncle", "aunt"] },
    { label: "coach", value: "coach" },
    { label: "rival", value: "rival" },
    { label: "other", value: "other" }
];

export const RELATIONSHIP_OPTIONS_BY_GENDER = {
    auto: ["friend", "mentor", "romantic-partner", "sibling", "parent", "coach", "rival", "other", "boyfriend", "girlfriend", "husband", "wife", "brother", "sister", "mother", "father", "uncle", "aunt"],
    male: ["friend", "mentor", "romantic-partner", "sibling", "parent", "coach", "rival", "other", "boyfriend", "girlfriend", "husband", "wife", "brother", "sister", "mother", "father", "uncle", "aunt"],
    female: ["friend", "mentor", "romantic-partner", "sibling", "parent", "coach", "rival", "other", "boyfriend", "girlfriend", "husband", "wife", "brother", "sister", "mother", "father", "uncle", "aunt"],
    "non-binary": ["friend", "mentor", "romantic-partner", "sibling", "parent", "coach", "rival", "other", "boyfriend", "girlfriend", "husband", "wife", "brother", "sister", "mother", "father", "uncle", "aunt"],
    other: ["friend", "mentor", "romantic-partner", "sibling", "parent", "coach", "rival", "other", "boyfriend", "girlfriend", "husband", "wife", "brother", "sister", "mother", "father", "uncle", "aunt"]
};

export const getRelationshipOptions = (gender = "auto") => {
    return RELATIONSHIP_OPTIONS_BY_GENDER[gender] || RELATIONSHIP_OPTIONS_BY_GENDER.auto;
};

export const QUICK_EMOJIS = ["😊", "😂", "😍", "😎", "🤔", "🥰", "😢", "🔥", "✨", "💬", "👍", "🎉"];

export const COMPANION_AVATAR_EMOJIS = ["👨", "👩", "🧑", "👨‍🦰", "👩‍🦰", "👨‍🦱", "👩‍🦱", "👨‍🦳", "👩‍🦳", "👨‍🦲", "👩‍🦲", "🧔"];
