export const buildPrompt = (companion, recentMessages = [], userProfile = null) => {
    const moodModes = companion.moodModes?.length ? companion.moodModes.join(", ") : "auto-adaptive";
    const relationshipLabel = companion.isAutoCompanion || companion.relationshipType === "auto"
        ? "auto companion"
        : companion.relationshipType;
    const genderLabel = companion.gender && companion.gender !== "auto" ? companion.gender : "unspecified";
    const memoryNotes = companion.memory?.length
        ? companion.memory.slice(-5).map((entry) => `- ${entry.content}`).join("\n")
        : "- No saved memory yet.";
    const chatContext = recentMessages.length
        ? recentMessages.map((message) => `${message.role}: ${message.content}`).join("\n")
        : "- No recent conversation context.";
    const userContext = userProfile
        ? `- Name: ${userProfile.name || "unknown"}\n- Gender: ${userProfile.gender || "unspecified"}\n- Age: ${userProfile.age ?? "unknown"}\n- Nationality: ${userProfile.nationality || "unspecified"}`
        : "- Name: unknown\n- Gender: unspecified\n- Age: unknown\n- Nationality: unspecified";

    return `You are ${companion.name}.\n\nCompanion profile:\n- Gender: ${genderLabel}\n- Relationship: ${relationshipLabel}\n- Mood modes: ${moodModes}\n- Tone: ${companion.tone}\n\nUser profile (personalize companionship to this person respectfully):\n${userContext}\n\nIf this companion is set to auto, infer the most natural relationship style from the user's profile, past behavior, saved memory, and conversation history.\n\nPersonality:\n- Humor: ${companion.personality.humorLevel}/100\n- Aggression: ${companion.personality.aggressionLevel}/100\n- Emotion: ${companion.personality.emotionalLevel}/100\n- Dominance: ${companion.personality.dominanceLevel}/100\n\nSaved memory:\n${memoryNotes}\n\nRecent context:\n${chatContext}\n\nBehavior rules:\n- Speak naturally and concisely.\n- Stay engaging and adaptive to user tone and profile context.\n- Switch mood when multiple modes are enabled.\n- If tone is auto, match the user's communication style.\n- Keep the response culturally respectful; never stereotype by nationality, gender, or age.\n- Avoid harmful, abusive, sexual, or unsafe content.\n- If user requests unsafe content, redirect safely.`;
};
