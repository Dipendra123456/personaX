import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const MEMORY_MODES = [
    { level: 1, label: "Easy", notes: "Calm pace" },
    { level: 3, label: "Medium", notes: "Balanced challenge" },
    { level: 5, label: "Hard", notes: "Sharper focus" },
    { level: 7, label: "Expert", notes: "High concentration" },
    { level: 9, label: "Master", notes: "Maximum challenge" }
];

const mapDifficultyToEnum = (difficulty) => {
    if (difficulty <= 1) return "easy";
    if (difficulty <= 3) return "medium";
    if (difficulty <= 5) return "hard";
    if (difficulty <= 7) return "expert";
    return "master";
};

const createEmptyCards = () => Array.from({ length: 16 }, (_, id) => ({ id, symbol: "?", revealed: false, matched: false }));

export default function MemoryGameMobile({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useAppStore((state) => state.token);
    const storeSelectedCompanion = useAppStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;

    const [status, setStatus] = useState("setup");
    const [sessionId, setSessionId] = useState(null);
    const [cards, setCards] = useState(createEmptyCards());
    const [currentTurn, setCurrentTurn] = useState("player");
    const [pairs, setPairs] = useState({ player: 0, companion: 0 });
    const [moves, setMoves] = useState(0);
    const [winner, setWinner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
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

    const selectedMode = useMemo(() => MEMORY_MODES.find((item) => item.level === Number(difficulty)) || MEMORY_MODES[1], [difficulty]);

    useEffect(() => () => {
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    const emitMessage = (text) => {
        setMessages((prev) => [text, ...prev].slice(0, 18));
        onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${text}`);
    };

    const syncState = (state) => {
        if (!state) return;

        setCards(state.cards || createEmptyCards());
        setCurrentTurn(state.currentTurn || "player");
        setPairs(state.pairs || { player: 0, companion: 0 });
        setMoves(Number(state.moves) || 0);
        setWinner(state.winner || null);
        if (state.status === "finished") {
            setStatus("finished");
        }
    };

    const startGame = async () => {
        if (!activeCompanion?._id) {
            setError("Select a companion before starting Memory Match.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "memory",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);

            setSessionId(session._id);
            setStatus("playing");
            syncState(session.state);
            emitMessage(`Memory Match started on ${selectedMode.label}. Your turn first.`);
        } catch (err) {
            setError(err.message || "Could not start Memory Match");
        } finally {
            setLoading(false);
        }
    };

    const runMove = async (move) => {
        if (!sessionId || loading || status !== "playing") return;

        setLoading(true);
        setError("");

        try {
            const result = await api.moveGame({ sessionId, move }, token);
            syncState(result?.session?.state);
            const message = result?.aiMove?.message;
            if (message) {
                emitMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply move");
        } finally {
            setLoading(false);
        }
    };

    const flipCard = (cardId) => {
        if (status !== "playing" || currentTurn !== "player") return;
        runMove({ action: "flip", cardId });
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
        setCards(createEmptyCards());
        setCurrentTurn("player");
        setPairs({ player: 0, companion: 0 });
        setMoves(0);
        setWinner(null);
        setMessages([]);
        setChatInput("");
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    const turnLabel = `${playerName}'s turn`;
    const summary = winner
        ? `${playerName} completed the board.`
        : "Flip two cards to find a pair.";

    return (
        <View style={styles.wrap}>
            {status === "setup" ? (
                <View style={styles.card}>
                    <Text style={styles.title}>Memory Match with {activeCompanion?.name || "Coach"}</Text>
                    <Text style={styles.sub}>Flip cards and clear all pairs. Companion stays as your coach.</Text>

                    <View style={styles.modeList}>
                        {MEMORY_MODES.map((mode) => (
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
                        <Text style={styles.title}>Memory Match</Text>
                        <Pressable onPress={resetGame} style={styles.secondaryBtn}><Text style={styles.secondaryText}>New</Text></Pressable>
                    </View>

                    <Text style={styles.meta}>{turnLabel}</Text>
                    <Text style={styles.meta}>Found: {pairs.player} • Remaining: {Math.max(0, 8 - pairs.player)} • Moves: {moves}</Text>

                    <View style={styles.grid}>
                        {cards.map((card) => {
                            const isFaceUp = card.revealed || card.matched;
                            return (
                                <Pressable
                                    key={card.id}
                                    onPress={() => flipCard(card.id)}
                                    disabled={status !== "playing" || currentTurn !== "player" || loading || isFaceUp}
                                    style={[
                                        styles.cardTile,
                                        isFaceUp
                                            ? card.matched
                                                ? styles.cardTileMatched
                                                : styles.cardTileFace
                                            : styles.cardTileBack
                                    ]}
                                >
                                    <Text style={isFaceUp ? styles.cardTileFaceText : styles.cardTileBackText}>{isFaceUp ? card.symbol : "?"}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Text style={[styles.meta, winner && styles.finishedText]}>{summary}</Text>

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
    modeList: { marginTop: 10, gap: 8 },
    modeBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.secondary },
    modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    modeText: { color: colors.textSecondary, fontWeight: "700" },
    modeTextActive: { color: colors.buttonText },
    modeHint: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    modeHintActive: { color: colors.buttonText },
    grid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cardTile: { width: "23%", aspectRatio: 1, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    cardTileBack: { borderColor: colors.border, backgroundColor: colors.secondary },
    cardTileFace: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    cardTileMatched: { borderColor: colors.success, backgroundColor: "rgba(80, 200, 120, 0.18)" },
    cardTileBackText: { color: colors.textMuted, fontWeight: "900", fontSize: 18 },
    cardTileFaceText: { color: colors.buttonText, fontWeight: "900", fontSize: 18 },
    error: { color: colors.error, marginTop: 8 },
    startBtn: { marginTop: 10, borderRadius: 12, backgroundColor: colors.buttonBg, paddingVertical: 12, alignItems: "center" },
    startText: { color: colors.buttonText, fontWeight: "900", fontSize: 16 },
    rowSpread: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    meta: { color: colors.textMuted, marginTop: 4 },
    finishedText: { color: colors.success },
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
