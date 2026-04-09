import { useMemo, useState } from "react";
import { api } from "../services/api";

const MODE_OPTIONS = ["strict", "supportive", "mentor", "roast"];

const SUGGESTED_CHIPS = [
    "I keep procrastinating",
    "I feel stuck",
    "I can't focus",
    "I'm overwhelmed"
];

const QUICK_START_ISSUES = [
    "Procrastination",
    "Burnout",
    "Low motivation",
    "Bad routine"
];

const parsePlanPayload = (payload) => {
    if (!payload) {
        return null;
    }

    if (typeof payload === "object") {
        return payload;
    }

    const text = String(payload || "").trim();
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

const normalizePlan = (result) => {
    const parsed = parsePlanPayload(result?.raw);

    const insight = result?.insight
        || parsed?.insight
        || "Let's break this down into a clear and manageable direction.";

    const actionPlanSource = result?.actionPlan
        || parsed?.actionPlan
        || parsed?.dailySchedule
        || parsed?.weeklyGoals
        || [];

    const actionPlan = Array.isArray(actionPlanSource)
        ? actionPlanSource
            .map((item) => {
                if (typeof item === "string") {
                    return item;
                }
                if (item && typeof item === "object") {
                    return item.step || item.task || item.title || item.description || JSON.stringify(item);
                }
                return "";
            })
            .map((text) => text.trim())
            .filter(Boolean)
        : [];

    const remindersSource = result?.reminders || parsed?.reminders || [];
    const reminders = Array.isArray(remindersSource)
        ? remindersSource.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const todaysFocus = result?.todaysFocus
        || parsed?.todaysFocus
        || actionPlan[0]
        || "Pick one 25-minute focus session and finish it before checking social apps.";

    return { insight, actionPlan, todaysFocus, reminders };
};

export default function SelfImprovementPanel({ token, selectedCompanionId, onUnauthorized, onError }) {
    const [input, setInput] = useState("I keep procrastinating");
    const [mode, setMode] = useState("supportive");
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState(null);
    const [chatHistory, setChatHistory] = useState([
        {
            role: "assistant",
            content: "Tell me what is blocking your progress right now, and I will turn it into a focused plan."
        }
    ]);
    const [taskChecks, setTaskChecks] = useState({});
    const [dailyStreak, setDailyStreak] = useState(0);
    const [streakAwardedForPlan, setStreakAwardedForPlan] = useState(false);
    const [reminderState, setReminderState] = useState("");

    const tasksCompleted = useMemo(
        () => Object.values(taskChecks).filter(Boolean).length,
        [taskChecks]
    );

    const handlePlanRequest = async (issueText) => {
        const problem = String(issueText || input).trim();

        if (!problem || problem.length < 3) {
            return;
        }

        if (!selectedCompanionId) {
            onError("Pick a companion in Home before generating a plan.");
            return;
        }

        onError("");
        setIsLoading(true);
        setReminderState("");
        setChatHistory((prev) => [...prev, { role: "user", content: problem }]);

        try {
            const result = await api.improve(
                {
                    companionId: selectedCompanionId,
                    problem,
                    mode
                },
                token
            );

            const normalized = normalizePlan(result);
            setPlan(normalized);
            setTaskChecks({});
            setStreakAwardedForPlan(false);

            setChatHistory((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: normalized.insight
                }
            ]);

            setInput("");
        } catch (err) {
            const text = String(err?.message || "Could not generate plan").toLowerCase();
            if (text.includes("unauthorized") || text.includes("invalid token")) {
                onUnauthorized();
                return;
            }
            onError(err?.message || "Could not generate plan");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTask = (index) => {
        setTaskChecks((prev) => {
            const nextValue = !prev[index];
            const next = { ...prev, [index]: nextValue };

            if (nextValue && !streakAwardedForPlan) {
                setDailyStreak((current) => current + 1);
                setStreakAwardedForPlan(true);
            }

            return next;
        });
    };

    const scheduleReminder = () => {
        setReminderState("Reminder saved. I will keep this focus visible for today.");
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
            <section className="personax-card overflow-hidden p-5">
                <div className="rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/15 via-amber-400/10 to-transparent p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-orange-300">Level Up</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">What's holding you back today?</h2>
                    <p className="mt-2 text-sm text-slate-300">
                        Talk it out. Get a clear plan. Start improving instantly.
                    </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                    <p className="text-sm font-semibold text-white">Conversation</p>

                    <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                        {chatHistory.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm transition-all duration-300 ${message.role === "user"
                                    ? "ml-auto border border-orange-500/40 bg-orange-500/20 text-orange-50"
                                    : "border border-slate-700 bg-slate-800 text-slate-200"
                                    }`}
                            >
                                {message.content}
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-3">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm"
                            placeholder="Tell me what's going on..."
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    handlePlanRequest();
                                }
                            }}
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                            {SUGGESTED_CHIPS.map((chip) => (
                                <button
                                    key={chip}
                                    type="button"
                                    onClick={() => {
                                        setInput(chip);
                                        handlePlanRequest(chip);
                                    }}
                                    className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-orange-400/50 hover:text-white"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm font-semibold text-white">AI mode</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {MODE_OPTIONS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setMode(option)}
                                className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-all ${mode === option
                                    ? "border-orange-300 bg-orange-400/20 text-orange-100"
                                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => handlePlanRequest()}
                        disabled={isLoading}
                        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3 font-semibold text-slate-950 hover:from-orange-300 hover:to-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isLoading ? "Building plan..." : "Get My Plan"}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-300">
                        <h3 className="text-sm uppercase tracking-[0.3em] text-orange-300">Insight</h3>
                        <p className="mt-2 text-sm text-slate-200">
                            {plan?.insight || "Your insight will appear here once you ask for a plan."}
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-300">
                        <h3 className="text-sm uppercase tracking-[0.3em] text-orange-300">Action Plan</h3>
                        <div className="mt-3 space-y-2">
                            {(plan?.actionPlan || []).length > 0 ? (
                                plan.actionPlan.map((step, index) => (
                                    <label
                                        key={`${step}-${index}`}
                                        className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(taskChecks[index])}
                                            onChange={() => toggleTask(index)}
                                            className="mt-1"
                                        />
                                        <span className="text-sm text-slate-200">{step}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400">Your steps will appear after plan generation.</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-300">
                        <h3 className="text-sm uppercase tracking-[0.3em] text-orange-300">Today's Focus</h3>
                        <p className="mt-2 text-sm text-slate-200">
                            {plan?.todaysFocus || "No focus task yet."}
                        </p>
                        <button
                            type="button"
                            onClick={scheduleReminder}
                            className="mt-3 rounded-xl border border-orange-300/40 bg-orange-400/20 px-4 py-2 text-sm font-semibold text-orange-100"
                        >
                            Set Reminder
                        </button>
                        {reminderState ? <p className="mt-2 text-xs text-emerald-300">{reminderState}</p> : null}
                    </section>
                </div>
            </section>

            <div className="space-y-4">
                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Quick Start</h3>
                    <p className="mt-1 text-sm text-slate-400">Tap an issue and get an instant plan starter.</p>
                    <div className="mt-3 grid gap-2">
                        {QUICK_START_ISSUES.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    const sentence = `I need help with ${item.toLowerCase()}.`;
                                    setInput(sentence);
                                    handlePlanRequest(sentence);
                                }}
                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:border-orange-300/50"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Progress Tracker</h3>
                    <div className="mt-3 space-y-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tasks completed</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{tasksCompleted}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Daily streak</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{dailyStreak}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
