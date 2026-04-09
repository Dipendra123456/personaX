import Companion from "../models/Companion.js";
import { getGeminiClient } from "../ai/geminiClient.js";

const MODE_STYLE_MAP = {
    strict: "strict, direct, and accountability-focused",
    supportive: "supportive, calm, and encouraging",
    mentor: "mentor-like, strategic, and growth-focused",
    roast: "playfully sharp and witty but never abusive, hateful, or demeaning"
};

const parseJsonPayload = (value) => {
    if (!value) {
        return null;
    }

    const text = String(value || "").trim();
    if (!text) {
        return null;
    }

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1] || text;

    try {
        return JSON.parse(candidate);
    } catch (_error) {
        return null;
    }
};

const sanitizeMode = (mode) => {
    const key = String(mode || "").toLowerCase();
    return MODE_STYLE_MAP[key] ? key : null;
};

const defaultStyleFromCompanion = (companion) => (
    companion.relationshipType === "mentor" ? "mentor" : "supportive"
);

const normalizeList = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => {
            if (typeof item === "string") {
                return item;
            }
            if (item && typeof item === "object") {
                return item.step || item.task || item.title || item.description || "";
            }
            return "";
        })
        .map((item) => String(item).trim())
        .filter(Boolean);
};

const normalizeRoutines = (value, fallbackDurationDays) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (typeof item === "string") {
                return {
                    id: `routine-${index + 1}`,
                    task: item,
                    durationDays: fallbackDurationDays
                };
            }

            if (item && typeof item === "object") {
                const task = item.task || item.title || item.step || item.description || "";
                const parsedDays = Number(item.durationDays);
                return {
                    id: item.id || `routine-${index + 1}`,
                    task: String(task).trim(),
                    durationDays: Number.isFinite(parsedDays) && parsedDays > 0
                        ? Math.min(Math.floor(parsedDays), 60)
                        : fallbackDurationDays
                };
            }

            return null;
        })
        .filter((item) => item && item.task);
};

export const buildImprovementPlan = async ({ userId, companionId, problem, mode }) => {
    const companion = await Companion.findOne({ _id: companionId, userId });
    if (!companion) {
        const error = new Error("Companion not found");
        error.status = 404;
        throw error;
    }

    const selectedMode = sanitizeMode(mode) || defaultStyleFromCompanion(companion);
    const style = MODE_STYLE_MAP[selectedMode] || MODE_STYLE_MAP.supportive;

    const gemini = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = gemini.getGenerativeModel({ model: modelName });

    const prompt = [
        `You are a self-improvement coach with a ${style} style.`,
        "Respond strictly as raw JSON with no markdown and no code fences.",
        "Return keys: insight (string), actionPlan (array of short actionable strings), todaysFocus (string), reminders (array of short strings), trackingRequired (boolean), trackingDurationDays (number), routines (array).",
        "Each routine item must be an object with task (string) and durationDays (number of daily repetitions).",
        "Keep output practical and concise.",
        `Create a plan for this issue: ${problem}`
    ].join("\n");

    const completion = await model.generateContent(prompt);
    const text = completion.response?.text?.()?.trim() || "{}";
    const parsed = parseJsonPayload(text) || {};

    const actionPlan = normalizeList(parsed.actionPlan || parsed.dailySchedule || parsed.weeklyGoals);
    const reminders = normalizeList(parsed.reminders);
    const trackingDurationDays = Math.max(
        1,
        Math.min(60, Math.floor(Number(parsed.trackingDurationDays || 14) || 14))
    );
    const routines = normalizeRoutines(parsed.routines || actionPlan, trackingDurationDays);
    const trackingRequired = Boolean(
        parsed.trackingRequired ?? (routines.length > 0)
    );
    const insight = String(parsed.insight || "").trim()
        || "You are not failing. You are overloaded, and we can fix this with one clear sequence of steps.";
    const todaysFocus = String(parsed.todaysFocus || "").trim()
        || actionPlan[0]
        || "Complete one 25-minute focus block on your highest-priority task.";

    return {
        raw: text,
        companionName: companion.name,
        mode: selectedMode,
        insight,
        actionPlan,
        todaysFocus,
        reminders,
        routines,
        trackingRequired,
        trackingDurationDays
    };
};
