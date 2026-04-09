import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const OTHELLO_MODES = [
    { level: 1, label: "Easy", notes: "Loose play" },
    { level: 3, label: "Medium", notes: "Balanced" },
    { level: 5, label: "Hard", notes: "Corner-aware" },
    { level: 7, label: "Expert", notes: "Strong control" },
    { level: 9, label: "Master", notes: "Best available" }
];

const mapDifficultyToEnum = (difficulty) => {
    if (difficulty <= 1) return "easy";
    if (difficulty <= 3) return "medium";
    if (difficulty <= 5) return "hard";
    if (difficulty <= 7) return "expert";
    return "master";
};

const createEmptyBoard = () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(0));
    board[3][3] = -1;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = -1;
    return board;
};

export default function OthelloGameMobile({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useAppStore((state) => state.token);
    const storeSelectedCompanion = useAppStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [status, setStatus] = useState("setup");
    const [sessionId, setSessionId] = useState(null);
    const [board, setBoard] = useState(createEmptyBoard());
    const [legalMoves, setLegalMoves] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("black");
    const [scores, setScores] = useState({ black: 2, white: 2 });
    const [lastMove, setLastMove] = useState(null);
    const [winner, setWinner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
    const [voiceSupported, setVoiceSupported] = useState(true);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const voiceTimerRef = useRef(null);
    const recordingMimeTypeRef = useRef("audio/webm");
    const selectedMode = useMemo(() => OTHELLO_MODES.find((item) => item.level === Number(difficulty)) || OTHELLO_MODES[1], [difficulty]);

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

    const syncState = (state) => {
        if (!state) return;
        setBoard(state.board || createEmptyBoard());
        setLegalMoves(state.legalMoves || []);
        setCurrentPlayer(state.currentPlayer || "black");
        setScores(state.scores || { black: 0, white: 0 });
        setLastMove(state.lastMove || null);
        setWinner(state.winner || null);
        if (state.status === "finished") {
            setStatus("finished");
        }
    };

    const startGame = async () => {
        if (!activeCompanion?._id) {
            setError("Select a companion before starting Othello.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "othello",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);
            setSessionId(session._id);
            setStatus("playing");
            syncState(session.state);
            emitMessage(`Othello started on ${selectedMode.label}. You are black.`);
        } catch (err) {
            setError(err.message || "Could not start Othello");
        } finally {
            setLoading(false);
        }
    };

    const sendMove = async (move) => {
        if (!sessionId || loading || status !== "playing") return;
        setLoading(true);
        setError("");
        try {
            const result = await api.moveGame({ sessionId, move }, token);
            syncState(result?.session?.state);
            if (result?.aiMove?.message) {
                emitMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply Othello move");
        } finally {
            setLoading(false);
        }
    };

    const placeDisc = (row, col) => {
        if (status !== "playing") return;
        sendMove({ action: "place", row, col });
    };

    const passTurn = () => {
        if (status !== "playing") return;
        sendMove({ action: "pass" });
    };

    const sendChat = async () => {
        const message = chatInput.trim();
        if (!message || !activeCompanion || chatLoading) return;
        setChatInput("");
        setMessages((prev) => [...prev, `${playerName}: ${message}`].slice(-18));
        setChatLoading(true);
        try {
            const response = await api.chat({ companionId: activeCompanion._id, message }, token);
            const reply = response.reply || response.message || "...";
            setMessages((prev) => [`${activeCompanion.name || "Coach"}: ${reply}`, ...prev].slice(0, 18));
            onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${reply}`);
        } catch (err) {
            setError(err.message || "Could not send message");
        } finally {
            setChatLoading(false);
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
                clearInterval(voiceTimerRef.current);

                try {
                    const result = await api.voiceChat(audioBlob, activeCompanion._id, token, {
                        liveTranscript: chatInput.trim()
                    });

                    const userMessage = result.userMessage || chatInput.trim() || "";
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
            setVoiceRecording(true);
            setVoiceRecordingTime(0);
            voiceTimerRef.current = setInterval(() => setVoiceRecordingTime((prev) => prev + 1), 1000);
        } catch (err) {
            setError(err.message || "Could not start voice recording");
        }
    };

    const toggleVoiceTalk = () => {
        if (voiceRecording) {
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            return;
        }

        startVoiceRecording();
    };

    const resetGame = () => {
        setStatus("setup");
        setSessionId(null);
        setBoard(createEmptyBoard());
        setLegalMoves([]);
        setCurrentPlayer("black");
        setScores({ black: 2, white: 2 });
        setLastMove(null);
        setWinner(null);
        setMessages([]);
        setChatInput("");
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    const isLegalMove = (row, col) => legalMoves.some((move) => move.row === row && move.col === col);

    return (
        <View style={styles.wrap}>
            {status === "setup" ? (
                <View style={styles.card}>
                    <Text style={styles.title}>Othello with {activeCompanion?.name || "Coach"}</Text>
                    <Text style={styles.sub}>Flip discs by trapping the opponent in any direction.</Text>

                    <View style={styles.modes}>
                        {OTHELLO_MODES.map((mode) => (
                            <Pressable
                                key={mode.level}
                                onPress={() => onDifficultyChange?.(mode.level)}
                                style={[styles.modeBtn, Number(difficulty) === mode.level && styles.modeBtnActive]}
                            >
                                <Text style={[styles.modeText, Number(difficulty) === mode.level && styles.modeTextActive]}>{mode.label}</Text>
                                <Text style={[styles.modeHint, Number(difficulty) === mode.level && styles.modeHintActive]}>{mode.notes}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Pressable onPress={startGame} style={styles.startBtn}>
                        <Text style={styles.startText}>{loading ? "Starting..." : "Play"}</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.card}>
                    <View style={styles.rowSpread}>
                        <Text style={styles.title}>Othello</Text>
                        <Pressable onPress={resetGame} style={styles.secondaryBtn}><Text style={styles.secondaryText}>New</Text></Pressable>
                    </View>
                    <Text style={styles.meta}>{playerName} • {selectedMode.label} • {currentPlayer === "black" ? "Your turn" : "Companion turn"}</Text>
                    <Text style={styles.meta}>Score: You {scores.black} - {scores.white} Coach</Text>

                    <View style={styles.board}>
                        {board.map((rowValues, row) => (
                            <View key={`row-${row}`} style={styles.boardRow}>
                                {rowValues.map((value, col) => {
                                    const legal = isLegalMove(row, col);
                                    const selected = lastMove?.row === row && lastMove?.col === col;
                                    return (
                                        <Pressable
                                            key={`${row}-${col}`}
                                            onPress={() => placeDisc(row, col)}
                                            disabled={status !== "playing" || loading || value !== 0 || !legal}
                                            style={[
                                                styles.cell,
                                                (row + col) % 2 === 0 ? styles.cellLight : styles.cellDark,
                                                selected && styles.cellSelected,
                                                legal && styles.cellLegal
                                            ]}
                                        >
                                            {value !== 0 ? (
                                                <View style={[styles.disc, value === 1 ? styles.blackDisc : styles.whiteDisc]} />
                                            ) : legal ? (
                                                <View style={styles.legalDot} />
                                            ) : null}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    <View style={styles.controlsRow}>
                        <Pressable onPress={passTurn} disabled={status !== "playing" || legalMoves.length > 0 || loading} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Pass</Text></Pressable>
                        <Pressable onPress={() => emitMessage(`Score is ${scores.black} to ${scores.white}.`)} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Score</Text></Pressable>
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Text style={[styles.meta, status === "finished" && styles.finishedText]}>
                        {winner ? (winner === "draw" ? "The match ended in a draw." : `${winner === "black" ? playerName : activeCompanion?.name || "Coach"} won the match.`) : currentPlayer === "black" ? "Your turn." : "Companion is thinking..."}
                    </Text>

                    <View style={styles.chatWrap}>
                        <Text style={styles.chatTitle}>Companion Chat</Text>
                        {messages.length ? messages.map((msg, idx) => (
                            <Text key={`${idx}-${msg.slice(0, 8)}`} style={styles.chatMessage}>{msg}</Text>
                        )) : <Text style={styles.chatEmpty}>Companion guidance appears here while you play.</Text>}

                        <View style={styles.voiceRow}>
                            <Pressable onPress={toggleVoiceTalk} disabled={!activeCompanion || chatLoading} style={[styles.voiceBtn, voiceRecording && styles.voiceBtnActive]}>
                                <Text style={styles.voiceBtnText}>{voiceRecording ? `🎤 ${voiceRecordingTime}s` : "🎤 Voice"}</Text>
                            </Pressable>
                            {!voiceSupported ? <Text style={styles.voiceHint}>Voice not supported here</Text> : null}
                        </View>

                        <View style={styles.chatRow}>
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Talk to your companion"
                                placeholderTextColor={colors.textMuted}
                                style={styles.chatInput}
                            />
                            <Pressable onPress={sendChat} disabled={chatLoading || !chatInput.trim()} style={styles.chatSendBtn}>
                                <Text style={styles.chatSendText}>{chatLoading ? "..." : "Send"}</Text>
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
    modes: { marginTop: 10, gap: 8 },
    modeBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.secondary },
    modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    modeText: { color: colors.textSecondary, fontWeight: "700" },
    modeTextActive: { color: colors.buttonText },
    modeHint: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    modeHintActive: { color: colors.buttonText },
    error: { color: colors.error, marginTop: 8 },
    startBtn: { marginTop: 10, borderRadius: 12, backgroundColor: colors.buttonBg, paddingVertical: 12, alignItems: "center" },
    startText: { color: colors.buttonText, fontWeight: "900", fontSize: 16 },
    rowSpread: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    meta: { color: colors.textMuted, marginTop: 4 },
    finishedText: { color: colors.success },
    board: { marginTop: 10, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#0b4f25", backgroundColor: "#14532d" },
    boardRow: { flexDirection: "row" },
    cell: { width: "12.5%", aspectRatio: 1, borderWidth: 0.5, borderColor: "#0b4f25", alignItems: "center", justifyContent: "center" },
    cellLight: { backgroundColor: "#0f7a36" },
    cellDark: { backgroundColor: "#0d6830" },
    cellSelected: { borderColor: colors.accent },
    cellLegal: { opacity: 0.95 },
    disc: { width: "70%", height: "70%", borderRadius: 999 },
    blackDisc: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2c2c2c" },
    whiteDisc: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#d4d4d8" },
    legalDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.72)" },
    controlsRow: { marginTop: 10, flexDirection: "row", gap: 8 },
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
    chatRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    chatInput: { flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.inputBg, color: colors.text, paddingHorizontal: 10, paddingVertical: 8 },
    chatSendBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentLight, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
    chatSendText: { color: colors.buttonText, fontWeight: "900" }
});
