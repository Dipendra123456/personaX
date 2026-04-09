export type RelationshipType = "friend" | "mentor" | "partner";
export type Tone = "aggressive" | "soft";

export interface Personality {
    humorLevel: number;
    aggressionLevel: number;
    emotionalLevel: number;
    dominanceLevel: number;
}

export interface Companion {
    _id: string;
    userId: string;
    name: string;
    avatar: string;
    relationshipType: RelationshipType;
    personality: Personality;
    moodModes: string[];
    tone: Tone;
    memory: Array<{ content: string; importance: number }>;
    createdAt: string;
}
