const blockedTerms = ["sexual content with minors", "self-harm instructions", "hate speech"];

export const isUnsafeText = (text = "") => {
    const normalized = text.toLowerCase();
    return blockedTerms.some((term) => normalized.includes(term));
};
