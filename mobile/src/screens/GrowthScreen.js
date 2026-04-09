import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const SUGGESTED_CHIPS = [
    "I keep procrastinating",
    "I feel stuck",
    "I can't focus",
    "I'm overwhelmed"
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
        || "You are not failing. You are overloaded, and we can simplify your next move.";

    const source = result?.actionPlan
        || parsed?.actionPlan
        || parsed?.dailySchedule
        || parsed?.weeklyGoals
        || [];

    const actionPlan = Array.isArray(source)
        ? source
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
            .filter(Boolean)
        : [];

    const remindersSource = result?.reminders || parsed?.reminders || [];
    const reminders = Array.isArray(remindersSource)
        ? remindersSource.map((item) => String(item).trim()).filter(Boolean)
        : [];

    const routinesSource = result?.routines || parsed?.routines || [];
    const routines = Array.isArray(routinesSource)
        ? routinesSource
            .map((item, index) => {
                if (typeof item === "string") {
                    return { id: `routine-${index + 1}`, task: item, durationDays: result?.trackingDurationDays || 14 };
                }

                if (item && typeof item === "object") {
                    const duration = Number(item.durationDays);
                    return {
                        id: item.id || `routine-${index + 1}`,
                        task: String(item.task || item.title || item.step || item.description || "").trim(),
                        durationDays: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : (result?.trackingDurationDays || 14)
                    };
                }

                return null;
            })
            .filter((item) => item && item.task)
        : [];

    const trackingDurationDays = Number(result?.trackingDurationDays || parsed?.trackingDurationDays || 14);

    const todaysFocus = result?.todaysFocus
        || parsed?.todaysFocus
        || actionPlan[0]
        || "Complete one 25-minute focus sprint before opening social apps.";

    const todaysTodos = actionPlan.slice(0, 3);

    return {
        insight,
        actionPlan,
        todaysFocus,
        reminders,
        routines,
        trackingDurationDays,
        todaysTodos
    };
};

export default function GrowthScreen() {
    const token = useAppStore((state) => state.token);
    const selectedCompanionId = useAppStore((state) => state.selectedCompanionId);

    const [input, setInput] = useState("I keep procrastinating");
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        {
            role: "assistant",
            content: "Tell me what's going on and I will turn it into a practical plan."
        }
    ]);
    const [taskChecks, setTaskChecks] = useState({});
    const [dailyStreak, setDailyStreak] = useState(0);
    const [streakAwardedForPlan, setStreakAwardedForPlan] = useState(false);
    const [reminderState, setReminderState] = useState("");
    const [errorText, setErrorText] = useState("");

    const generatePlan = async (issueText) => {
        const problem = String(issueText || input).trim();
        if (!problem || problem.length < 3) {
            return;
        }

        if (!selectedCompanionId) {
            setErrorText("Choose a companion in Home first.");
            return;
        }

        setLoading(true);
        setErrorText("");
        setReminderState("");
        setChatHistory((prev) => [...prev, { role: "user", content: problem }]);

        try {
            const result = await api.improve({ companionId: selectedCompanionId, problem }, token);
            const normalized = normalizePlan(result);
            setPlan(normalized);
            setTaskChecks({});
            setStreakAwardedForPlan(false);
            setInput("");
            setChatHistory((prev) => [...prev, { role: "assistant", content: normalized.insight }]);
        } catch (err) {
            setErrorText(err.message || "Could not generate plan");
        } finally {
            setLoading(false);
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

    const handleReminder = () => {
        setReminderState("Reminder saved. Stay locked in on today's priorities.");
    };

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Conversation</Text>

                <View style={styles.messageList}>
                    {chatHistory.map((message, index) => (
                        <View
                            key={`${message.role}-${index}`}
                            style={[
                                styles.bubble,
                                message.role === "user" ? styles.userBubble : styles.aiBubble
                            ]}
                        >
                            <Text style={styles.bubbleText}>{message.content}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.inputRow}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Tell me what's going on..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        returnKeyType="send"
                        onSubmitEditing={() => generatePlan()}
                    />
                    <Pressable
                        onPress={() => generatePlan()}
                        style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                        disabled={!input.trim() || loading}
                    >
                        <Text style={styles.sendText}>{loading ? "..." : "Send"}</Text>
                    </Pressable>
                </View>

            </View>

            {errorText ? (
                <View style={[styles.card, styles.errorCard]}>
                    <Text style={styles.errorText}>{errorText}</Text>
                </View>
            ) : null}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Insight</Text>
                <Text style={styles.output}>{plan?.insight || "Your insight will appear here."}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Action Plan</Text>
                <Text style={styles.subSectionTitle}>Todos</Text>
                {(plan?.actionPlan || []).length > 0 ? (
                    plan.actionPlan.map((step, index) => (
                        <Pressable key={`${step}-${index}`} onPress={() => toggleTask(index)} style={styles.stepCard}>
                            <View style={[styles.check, taskChecks[index] ? styles.checkActive : null]} />
                            <Text style={styles.stepText}>{step}</Text>
                        </Pressable>
                    ))
                ) : (
                    <Text style={styles.output}>Your todo list will appear after plan generation.</Text>
                )}

                <Text style={styles.subSectionTitle}>Roadmap</Text>
                {(plan?.routines || []).length > 0 ? (
                    plan.routines.map((routine) => (
                        <View key={routine.id} style={styles.roadmapItem}>
                            <Text style={styles.roadmapTask}>{routine.task}</Text>
                            <Text style={styles.roadmapDays}>{routine.durationDays} days</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.output}>Your roadmap phases will appear after plan generation.</Text>
                )}

                <Text style={styles.subSectionTitle}>Streak</Text>
                <View style={styles.streakCard}>
                    <Text style={styles.streakLabel}>Current streak</Text>
                    <Text style={styles.streakValue}>{dailyStreak} day{dailyStreak === 1 ? "" : "s"}</Text>
                    <Text style={styles.streakHint}>Complete at least one todo daily to keep your streak alive.</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Today's Focus</Text>
                <Text style={styles.output}>{plan?.todaysFocus || "No focus task yet."}</Text>
                {(plan?.todaysTodos || []).length > 0 ? (
                    <View style={styles.todayList}>
                        {plan.todaysTodos.map((todo, index) => (
                            <View key={`${todo}-${index}`} style={styles.todayItem}>
                                <Text style={styles.todayBullet}>•</Text>
                                <Text style={styles.todayText}>{todo}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
                <Pressable style={styles.secondaryBtn} onPress={handleReminder}>
                    <Text style={styles.secondaryText}>Set Reminder</Text>
                </Pressable>
                {reminderState ? <Text style={styles.reminderText}>{reminderState}</Text> : null}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 36 },
    card: {
        backgroundColor: colors.secondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 12
    },
    cardTitle: {
        color: colors.text,
        fontWeight: "800",
        fontSize: 24,
        marginBottom: 10
    },
    messageList: {
        maxHeight: 220,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
        backgroundColor: colors.primary,
        marginBottom: 10,
        gap: 8
    },
    bubble: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxWidth: "90%"
    },
    aiBubble: {
        alignSelf: "flex-start",
        backgroundColor: colors.inputBg,
        borderColor: colors.inputBorder
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: colors.accent,
        borderColor: colors.accent
    },
    bubbleText: {
        color: colors.buttonText,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "700"
    },
    input: {
        flex: 1,
        backgroundColor: colors.inputBg,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 46
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8
    },
    sendBtn: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        paddingHorizontal: 14,
        minHeight: 46,
        justifyContent: "center",
        alignItems: "center"
    },
    sendBtnDisabled: {
        opacity: 0.65
    },
    sendText: {
        color: colors.buttonText,
        fontWeight: "800"
    },
    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10
    },
    chip: {
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7
    },
    chipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "700"
    },
    primaryBtn: {
        width: "100%",
        backgroundColor: colors.accent,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center"
    },
    secondaryBtn: {
        marginTop: 12,
        backgroundColor: colors.inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        alignItems: "center"
    },
    primaryText: {
        color: colors.buttonText,
        fontWeight: "900"
    },
    secondaryText: {
        color: colors.textSecondary,
        fontWeight: "900"
    },
    subSectionTitle: {
        color: colors.text,
        fontWeight: "800",
        marginBottom: 8,
        marginTop: 6,
        fontSize: 16
    },
    output: {
        color: colors.textMuted,
        lineHeight: 20
    },
    stepCard: {
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10
    },
    check: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.textMuted,
        marginTop: 2
    },
    checkActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent
    },
    stepText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        flex: 1
    },
    roadmapItem: {
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
    },
    roadmapTask: {
        color: colors.textSecondary,
        fontWeight: "700",
        flex: 1
    },
    roadmapDays: {
        color: colors.accent,
        fontWeight: "800",
        fontSize: 12,
        textTransform: "uppercase"
    },
    streakCard: {
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 12,
        padding: 12
    },
    streakLabel: {
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontSize: 11,
        fontWeight: "800"
    },
    streakValue: {
        color: colors.text,
        marginTop: 4,
        fontWeight: "900",
        fontSize: 24
    },
    streakHint: {
        color: colors.textMuted,
        marginTop: 4,
        lineHeight: 18
    },
    todayList: {
        marginTop: 10,
        marginBottom: 4,
        gap: 6
    },
    todayItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8
    },
    todayBullet: {
        color: colors.accent,
        fontSize: 18,
        lineHeight: 18,
        fontWeight: "900"
    },
    todayText: {
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 20
    },
    reminderText: {
        marginTop: 8,
        color: colors.accentLight,
        fontSize: 12,
        lineHeight: 16
    },
    errorCard: {
        borderColor: colors.error,
        backgroundColor: colors.errorBg
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: "700"
    }
});
