import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const SUDOKU_MODES = [
    { level: 1, label: "Easy", hint: "More clues", difficulty: "easy" },
    { level: 3, label: "Medium", hint: "Balanced", difficulty: "medium" },
    { level: 5, label: "Hard", hint: "Fewer clues", difficulty: "hard" },
    { level: 7, label: "Expert", hint: "Tight board", difficulty: "expert" },
    { level: 9, label: "Master", hint: "Very sparse", difficulty: "master" }
];

const TIME_CONTROLS = [5, 10, 15, 20];
const ORANGE = {
    accent: "#f59e0b",
    accentSoft: "rgba(245, 158, 11, 0.18)",
    accentText: "#fff3d3",
    panel: "#2f1d0f",
    panelAlt: "#4b3015",
    border: "#8f5a22",
    selected: "#f59e0b",
    selectedText: "#1f1302"
};

const mapDifficultyToEnum = (difficulty) => {
    if (difficulty <= 1) return "easy";
    if (difficulty <= 3) return "medium";
    if (difficulty <= 5) return "hard";
    if (difficulty <= 7) return "expert";
    return "master";
};

const formatClock = (seconds) => {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default function SudokuGameMobile({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useAppStore((state) => state.token);
    const storeSelectedCompanion = useAppStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [status, setStatus] = useState("setup");
    const [sessionId, setSessionId] = useState(null);
    const [selectedMinutes, setSelectedMinutes] = useState(5);
    const [secondsLeft, setSecondsLeft] = useState(300);
    const [board, setBoard] = useState(Array.from({ length: 9 }, () => Array(9).fill(0)));
    const [fixedMask, setFixedMask] = useState(Array.from({ length: 9 }, () => Array(9).fill(false)));
    const [selectedCell, setSelectedCell] = useState(null);
    const [mistakes, setMistakes] = useState(0);
    const [maxMistakes, setMaxMistakes] = useState(3);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [messages, setMessages] = useState([]);
    const [liveChatInput, setLiveChatInput] = useState("");
    const [liveChatLoading, setLiveChatLoading] = useState(false);
    const [voiceTalkEnabled, setVoiceTalkEnabled] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
    const [voiceSupported, setVoiceSupported] = useState(true);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const voiceTimerRef = useRef(null);
    const recordingMimeTypeRef = useRef("audio/webm");

    const companionName = activeCompanion?.name || "Coach";
    const selectedDiff = useMemo(() => SUDOKU_MODES.find((item) => item.level === Number(difficulty)) || SUDOKU_MODES[1], [difficulty]);

    const emitMessage = (text) => {
        setMessages((prev) => [text, ...prev].slice(0, 18));
        onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${text}`);
    };

    useEffect(() => () => {
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    const sendLiveChat = async () => {
        const message = liveChatInput.trim();
        if (!message || !activeCompanion || liveChatLoading) {
            return;
        }

        setLiveChatInput("");
        setMessages((prev) => [...prev, `${playerName}: ${message}`].slice(-18));
        setLiveChatLoading(true);

        try {
            const response = await api.chat({ companionId: activeCompanion._id, message }, token);
            const reply = response.reply || response.message || "...";
            setMessages((prev) => [`${activeCompanion.name || "Coach"}: ${reply}`, ...prev].slice(0, 18));
            onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${reply}`);
        } catch (err) {
            setError(err.message || "Could not send message");
        } finally {
            setLiveChatLoading(false);
        }
    };

    const startVoiceRecording = async () => {
        if (!activeCompanion || !token) {
            setError("Select a companion first.");
            return;
        }

        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setVoiceSupported(false);
            setError("Voice talk is not supported in this environment.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
            const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "audio/webm";
            const recorder = new MediaRecorder(stream, { mimeType });

            audioChunksRef.current = [];
            recordingMimeTypeRef.current = mimeType;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeTypeRef.current });
                audioChunksRef.current = [];

                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                    mediaStreamRef.current = null;
                }

                setVoiceRecording(false);
                setVoiceTalkEnabled(false);
                clearInterval(voiceTimerRef.current);

                try {
                    const result = await api.voiceChat(audioBlob, activeCompanion._id, token, {
                        liveTranscript: liveChatInput.trim()
                    });

                    const userMessage = result.userMessage || liveChatInput.trim() || "";
                    const reply = result.reply || result.message || "...";

                    if (userMessage) {
                        setMessages((prev) => [...prev, `${playerName}: ${userMessage}`].slice(-18));
                    }
                    setMessages((prev) => [`${activeCompanion.name || "Coach"}: ${reply}`, ...prev].slice(0, 18));
                    onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${reply}`);
                } catch (err) {
                    setError(err.message || "Voice message failed");
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setVoiceTalkEnabled(true);
            setVoiceRecording(true);
            setVoiceRecordingTime(0);
            voiceTimerRef.current = setInterval(() => setVoiceRecordingTime((prev) => prev + 1), 1000);
        } catch (err) {
            setError(err.message || "Could not start voice recording");
        }
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };

    const toggleVoiceTalk = () => {
        if (voiceRecording) {
            stopVoiceRecording();
            return;
        }
        startVoiceRecording();
    };

    const syncState = (state) => {
        if (!state) return;
        setBoard(state.board || Array.from({ length: 9 }, () => Array(9).fill(0)));
        setFixedMask(state.fixedMask || Array.from({ length: 9 }, () => Array(9).fill(false)));
        setMistakes(Number(state.mistakes) || 0);
        setMaxMistakes(Number(state.maxMistakes) || 3);
        setHintsUsed(Number(state.hintsUsed) || 0);
        setIsPaused(Boolean(state.isPaused));
        if (state.status === "won") {
            setStatus("won");
        } else if (state.status === "finished") {
            setStatus("ended");
        }
    };

    const runAction = async (move) => {
        if (!sessionId || loading) return;
        setLoading(true);
        setError("");
        try {
            const result = await api.moveGame({ sessionId, move }, token);
            syncState(result?.session?.state);
            if (result?.aiMove?.message) {
                emitMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply action");
        } finally {
            setLoading(false);
        }
    };

    const startGame = async () => {
        if (!activeCompanion?._id) {
            setError("Select a companion first.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "sudoku",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);
            setSessionId(session._id);
            setStatus("playing");
            setSecondsLeft(selectedMinutes * 60);
            setSelectedCell(null);
            syncState(session.state);
            emitMessage(`Sudoku started on ${selectedDiff.label}. I am coaching this round.`);
        } catch (err) {
            setError(err.message || "Could not start Sudoku");
        } finally {
            setLoading(false);
        }
    };

    const resetGame = () => {
        setStatus("setup");
        setSessionId(null);
        setBoard(Array.from({ length: 9 }, () => Array(9).fill(0)));
        setFixedMask(Array.from({ length: 9 }, () => Array(9).fill(false)));
        setSelectedCell(null);
        setMistakes(0);
        setHintsUsed(0);
        setIsPaused(false);
        setSecondsLeft(selectedMinutes * 60);
        setMessages([]);
        setLiveChatInput("");
        setVoiceTalkEnabled(false);
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    useEffect(() => {
        if (status !== "playing" || isPaused) return;

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setStatus("ended");
                    emitMessage("Time over. Start a new puzzle.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [status, isPaused]);

    const setValue = (value) => {
        if (!selectedCell || status !== "playing") return;
        runAction({ action: "set-value", row: selectedCell.row, col: selectedCell.col, value });
    };

    const erase = () => {
        if (!selectedCell || status !== "playing") return;
        runAction({ action: "erase", row: selectedCell.row, col: selectedCell.col });
    };

    const hint = () => {
        if (status !== "playing") return;
        if (selectedCell) {
            runAction({ action: "hint", row: selectedCell.row, col: selectedCell.col });
            return;
        }
        runAction({ action: "hint" });
    };

    const undo = () => {
        if (status !== "playing") return;
        runAction({ action: "undo" });
    };

    const togglePause = () => {
        if (status !== "playing") return;
        runAction({ action: "pause" });
    };

    return (
        <View style={styles.wrap}>
            {status === "setup" ? (
                <View style={styles.card}>
                    <Text style={styles.title}>Sudoku with {companionName}</Text>
                    <Text style={styles.sub}>Pick a Sudoku mode and session timer, then start.</Text>

                    <View style={styles.chipsRow}>
                        {TIME_CONTROLS.map((mins) => (
                            <Pressable key={mins} onPress={() => { setSelectedMinutes(mins); setSecondsLeft(mins * 60); }} style={[styles.chip, selectedMinutes === mins && styles.chipActive]}>
                                <Text style={[styles.chipText, selectedMinutes === mins && styles.chipTextActive]}>{mins}m</Text>
                            </Pressable>
                        ))}
                    </View>

                    <ScrollView style={styles.levelList}>
                        {SUDOKU_MODES.map((item) => (
                            <Pressable key={item.level} onPress={() => onDifficultyChange?.(item.level)} style={[styles.levelBtn, Number(difficulty) === item.level && styles.levelBtnActive]}>
                                <Text style={[styles.levelText, Number(difficulty) === item.level && styles.levelTextActive]}>{item.label}</Text>
                                <Text style={[styles.levelHint, Number(difficulty) === item.level && styles.levelHintActive]}>{item.hint}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Pressable onPress={startGame} style={styles.startBtn}>
                        <Text style={styles.startText}>{loading ? "Starting..." : "Play"}</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.card}>
                    <View style={styles.rowSpread}>
                        <Text style={styles.title}>Sudoku</Text>
                        <Pressable onPress={resetGame} style={styles.secondaryBtn}><Text style={styles.secondaryText}>New</Text></Pressable>
                    </View>
                    <Text style={styles.meta}>{playerName} • {selectedDiff.label} • {formatClock(secondsLeft)}</Text>
                    <Text style={styles.meta}>Mistakes: {mistakes}/{maxMistakes} • Hints: {hintsUsed}</Text>

                    <View style={styles.board}>
                        {board.map((rowValues, row) => (
                            <View key={`row-${row}`} style={styles.boardRow}>
                                {rowValues.map((value, col) => {
                                    const fixed = Boolean(fixedMask[row]?.[col]);
                                    const selected = selectedCell?.row === row && selectedCell?.col === col;
                                    return (
                                        <Pressable
                                            key={`${row}-${col}`}
                                            onPress={() => setSelectedCell({ row, col })}
                                            disabled={status !== "playing" || isPaused}
                                            style={[styles.cell, fixed && styles.cellFixed, selected && styles.cellSelected]}
                                        >
                                            <Text style={[styles.cellText, fixed ? styles.fixedText : styles.userText]}>{value || ""}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    <View style={styles.padGrid}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Pressable key={num} onPress={() => setValue(num)} style={styles.padBtn}><Text style={styles.padText}>{num}</Text></Pressable>
                        ))}
                    </View>

                    <View style={styles.controlsRow}>
                        <Pressable onPress={erase} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Erase</Text></Pressable>
                        <Pressable onPress={undo} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Undo</Text></Pressable>
                        <Pressable onPress={hint} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Hint</Text></Pressable>
                        <Pressable onPress={togglePause} style={styles.secondaryBtn}><Text style={styles.secondaryText}>{isPaused ? "Resume" : "Pause"}</Text></Pressable>
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.chatWrap}>
                        <Text style={styles.chatTitle}>Companion Chat</Text>
                        {messages.length ? messages.map((msg, idx) => (
                            <Text key={`${idx}-${msg.slice(0, 8)}`} style={styles.chatMessage}>{msg}</Text>
                        )) : <Text style={styles.chatEmpty}>Companion tips will appear here.</Text>}

                        <View style={styles.voiceRow}>
                            <Pressable onPress={toggleVoiceTalk} disabled={!activeCompanion || liveChatLoading} style={[styles.voiceBtn, voiceRecording && styles.voiceBtnActive]}>
                                <Text style={styles.voiceBtnText}>{voiceRecording ? `🎤 ${voiceRecordingTime}s` : "🎤 Voice"}</Text>
                            </Pressable>
                            {!voiceSupported ? <Text style={styles.voiceHint}>Voice not supported here</Text> : null}
                        </View>

                        <View style={styles.chatInputRow}>
                            <TextInput
                                value={liveChatInput}
                                onChangeText={setLiveChatInput}
                                placeholder="Talk to your companion"
                                placeholderTextColor={colors.textMuted}
                                style={styles.chatInput}
                            />
                            <Pressable onPress={sendLiveChat} disabled={liveChatLoading || !liveChatInput.trim()} style={styles.chatSendBtn}>
                                <Text style={styles.chatSendText}>{liveChatLoading ? "..." : "Send"}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginTop: 8 },
    card: { backgroundColor: colors.cardBg, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 12 },
    title: { color: colors.text, fontSize: 20, fontWeight: "800" },
    sub: { color: colors.textMuted, marginTop: 4 },
    chipsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
    chip: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.secondary },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    chipText: { color: colors.textMuted, fontWeight: "700" },
    chipTextActive: { color: colors.buttonText },
    levelList: { marginTop: 10, maxHeight: 220 },
    levelBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.secondary, marginBottom: 6 },
    levelBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    levelText: { color: colors.textSecondary, fontWeight: "700" },
    levelTextActive: { color: colors.buttonText },
    levelHint: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    levelHintActive: { color: colors.buttonText },
    error: { color: "#fdba74", marginTop: 8 },
    startBtn: { marginTop: 10, borderRadius: 12, backgroundColor: colors.buttonBg, paddingVertical: 12, alignItems: "center" },
    startText: { color: colors.buttonText, fontWeight: "900", fontSize: 16 },
    rowSpread: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    meta: { color: colors.textMuted, marginTop: 4 },
    board: { marginTop: 10, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: ORANGE.border, backgroundColor: "#f8ead1" },
    boardRow: { flexDirection: "row" },
    cell: { width: "11.111%", aspectRatio: 1, borderWidth: 0.5, borderColor: "#d6c49b", alignItems: "center", justifyContent: "center", backgroundColor: "#f7edd6" },
    cellFixed: { backgroundColor: "#e9dcc0" },
    cellSelected: { backgroundColor: ORANGE.accent },
    cellText: { fontSize: 16, fontWeight: "700" },
    fixedText: { color: "#1f1302" },
    userText: { color: "#9a3412" },
    padGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    padBtn: { width: "30.5%", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: colors.secondary },
    padText: { color: colors.text, fontWeight: "800" },
    controlsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.secondary },
    secondaryText: { color: colors.text, fontWeight: "700" },
    chatWrap: { marginTop: 10, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 8, backgroundColor: colors.primary },
    chatTitle: { color: colors.text, fontWeight: "800", marginBottom: 6 },
    chatMessage: { color: colors.textSecondary, marginBottom: 4 },
    chatEmpty: { color: colors.textMuted },
    voiceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 },
    voiceBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 8 },
    voiceBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    voiceBtnText: { color: colors.buttonText, fontWeight: "800" },
    voiceHint: { color: colors.textMuted, fontSize: 11 },
    chatInputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    chatInput: { flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.inputBg, color: colors.text, paddingHorizontal: 10, paddingVertical: 8 },
    chatSendBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentLight, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
    chatSendText: { color: colors.buttonText, fontWeight: "900" }
});
