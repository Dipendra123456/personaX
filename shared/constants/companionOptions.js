export const GENDER_OPTIONS = ["auto", "male", "female", "non-binary", "other"];

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

export const RELATIONSHIP_TYPES = [
    "auto",
    "friend",
    "mentor",
    "romantic-partner",
    "boyfriend",
    "girlfriend",
    "husband",
    "wife",
    "sibling",
    "brother",
    "sister",
    "parent",
    "mother",
    "father",
    "uncle",
    "aunt",
    "coach",
    "rival",
    "other"
];

export const RELATIONSHIP_OPTION_GROUPS = {
    auto: RELATIONSHIP_TYPES.filter((item) => item !== "auto"),
    male: RELATIONSHIP_TYPES.filter((item) => item !== "auto"),
    female: RELATIONSHIP_TYPES.filter((item) => item !== "auto"),
    "non-binary": RELATIONSHIP_TYPES.filter((item) => item !== "auto"),
    other: RELATIONSHIP_TYPES.filter((item) => item !== "auto")
};

export const getRelationshipOptions = () => RELATIONSHIP_TYPES.filter((item) => item !== "auto");

export const TONE_OPTIONS = [
    "auto",
    "soft",
    "casual",
    "confident",
    "flirty",
    "bold",
    "sarcastic",
    "witty",
    "intellectual",
    "dramatic",
    "playful"
];

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

export const BEHAVIOR_MODES = [
    "talkative",
    "listener",
    "reactive",
    "proactive",
    "challenger",
    "supporter",
    "teacher",
    "observer",
    "entertainer",
    "planner"
];
