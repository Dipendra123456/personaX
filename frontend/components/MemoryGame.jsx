import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

const MEMORY_MODES = [
    { level: 1, label: "Easy", notes: "Calm pace", difficulty: "easy" },
    { level: 3, label: "Medium", notes: "Balanced challenge", difficulty: "medium" },
    { level: 5, label: "Hard", notes: "Sharper focus", difficulty: "hard" },
    { level: 7, label: "Expert", notes: "High concentration", difficulty: "expert" },
    { level: 9, label: "Master", notes: "Maximum challenge", difficulty: "master" }
];

const mapDifficultyToEnum = (difficulty) => {
    if (difficulty <= 1) return "easy";
    if (difficulty <= 3) return "medium";
    if (difficulty <= 5) return "hard";
    if (difficulty <= 7) return "expert";
    return "master";
};

const createEmptyCards = () => Array.from({ length: 16 }, (_, id) => ({ id, symbol: "?", revealed: false, matched: false }));

export default function MemoryGame({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useCompanionStore((state) => state.token);
    const storeSelectedCompanion = useCompanionStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;

    const [gameStatus, setGameStatus] = useState("setup");
    const [sessionId, setSessionId] = useState(null);
    const [cards, setCards] = useState(createEmptyCards());
    const [currentTurn, setCurrentTurn] = useState("player");
    const [pairs, setPairs] = useState({ player: 0, companion: 0 });
    const [moves, setMoves] = useState(0);
    const [winner, setWinner] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [companionMessages, setCompanionMessages] = useState([]);
    const [liveChatInput, setLiveChatInput] = useState("");
    const [liveChatLoading, setLiveChatLoading] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
    const [voiceSupported, setVoiceSupported] = useState(true);

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

    const emitGameMessage = (text) => {
        setCompanionMessages((prev) => [text, ...prev].slice(0, 16));
        onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${text}`);
    };

    const syncState = (state) => {
        if (!state) {
            return;
        }

        setCards(state.cards || createEmptyCards());
        setCurrentTurn(state.currentTurn || "player");
        setPairs(state.pairs || { player: 0, companion: 0 });
        setMoves(Number(state.moves) || 0);
        setWinner(state.winner || null);

        if (state.status === "finished") {
            setGameStatus("finished");
        }
    };

    const startGame = async () => {
        if (!activeCompanion?._id) {
            setError("Pick a companion before starting Memory Match.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "memory",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);

            setSessionId(session._id);
            setGameStatus("playing");
            syncState(session.state);
            emitGameMessage(`Memory Match started on ${selectedMode.label}. Your turn first.`);
        } catch (err) {
            setError(err.message || "Could not start Memory Match");
        } finally {
            setIsLoading(false);
        }
    };

    const runMove = async (move) => {
        if (!sessionId || isLoading || gameStatus !== "playing") {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await api.moveGame({ sessionId, move }, token);
            syncState(result?.session?.state);
            const message = result?.aiMove?.message;
            if (message) {
                emitGameMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply move");
        } finally {
            setIsLoading(false);
        }
    };

    const flipCard = (cardId) => {
        if (gameStatus !== "playing" || currentTurn !== "player") {
            return;
        }
        runMove({ action: "flip", cardId });
    };

    const resetToSetup = () => {
        setGameStatus("setup");
        setSessionId(null);
        setCards(createEmptyCards());
        setCurrentTurn("player");
        setPairs({ player: 0, companion: 0 });
        setMoves(0);
        setWinner(null);
        setCompanionMessages([]);
        setLiveChatInput("");
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    const sendLiveChat = async () => {
        const message = liveChatInput.trim();
        if (!message || !activeCompanion || liveChatLoading) {
            return;
        }

        setLiveChatInput("");
        setCompanionMessages((prev) => [...prev, `${playerName}: ${message}`].slice(-16));
        setLiveChatLoading(true);

        try {
            const response = await api.chat({ companionId: activeCompanion._id, message }, token);
            const reply = response.reply || response.message || "...";
            setCompanionMessages((prev) => [`${activeCompanion.name || "Coach"}: ${reply}`, ...prev].slice(0, 16));
            onGameMessage?.(`${activeCompanion.name ? `${activeCompanion.name}: ` : ""}${reply}`);
        } catch (err) {
            setError(err.message || "Could not send message");
        } finally {
            setLiveChatLoading(false);
        }
    };

    const startVoiceRecording = async () => {
        if (!activeCompanion || !token) {
            setError("Pick a companion before using voice talk.");
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
                        liveTranscript: liveChatInput.trim()
                    });

                    const userMessage = result.userMessage || liveChatInput.trim() || "";
                    const reply = result.reply || result.message || "...";

                    if (userMessage) {
                        setCompanionMessages((prev) => [...prev, `${playerName}: ${userMessage}`].slice(-16));
                    }
                    setCompanionMessages((prev) => [`${activeCompanion.name || "Coach"}: ${reply}`, ...prev].slice(0, 16));
                    onGameMessage?.(`${activeCompanion.name ? `${activeCompanion.name}: ` : ""}${reply}`);
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

    const turnLabel = `${playerName}'s turn`;
    const summary = winner
        ? `${playerName} completed the board.`
        : "Flip two cards to find a pair.";

    const renderCard = (card) => {
        const isFaceUp = card.revealed || card.matched;
        return (
            <button
                key={card.id}
                type="button"
                onClick={() => flipCard(card.id)}
                disabled={gameStatus !== "playing" || currentTurn !== "player" || isLoading || isFaceUp}
                className={`aspect-square rounded-md border text-xl font-bold transition ${isFaceUp
                    ? card.matched
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                        : "border-brand-500 bg-slate-700 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-300 hover:border-brand-500"
                    }`}
            >
                {isFaceUp ? card.symbol : "?"}
            </button>
        );
    };

    if (gameStatus === "setup") {
        return (
            <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-md border border-slate-800 bg-slate-900 p-2">
                    <div className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{activeCompanion?.name || "Coach"}</div>
                    <div className="mt-1 rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{playerName}</div>
                </section>

                <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
                    <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Play Memory Match with {activeCompanion?.name || "Coach"}</h3>
                    <p className="mt-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs leading-relaxed text-slate-300">
                        Flip cards and clear all pairs. Your companion stays as your coach for chat and voice.
                    </p>

                    <div className="mt-3 space-y-2">
                        {MEMORY_MODES.map((mode) => (
                            <button
                                key={mode.level}
                                type="button"
                                onClick={() => onDifficultyChange?.(mode.level)}
                                className={`w-full rounded-md border px-3 py-2 text-left transition ${Number(difficulty) === mode.level
                                    ? "border-brand-500 bg-brand-500/20 text-white"
                                    : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-base font-semibold">{mode.label}</span>
                                    <span className="text-xs text-slate-400">{mode.notes}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

                    <button
                        type="button"
                        onClick={startGame}
                        disabled={isLoading}
                        className="mt-3 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-lg font-bold text-black hover:bg-brand-600 disabled:opacity-60"
                    >
                        {isLoading ? "Starting..." : "Play"}
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{activeCompanion?.name || "Coach"}</div>
                <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-slate-700 bg-slate-950 p-2">
                    {cards.map((card) => renderCard(card))}
                </div>
                <div className="mt-1 rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{playerName}</div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs font-semibold text-slate-300">
                    <span>{selectedMode.label}</span>
                    <button type="button" onClick={resetToSetup} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800">
                        New Game
                    </button>
                </div>
            </section>

            <section className="rounded-md border border-slate-700 bg-slate-900 p-4">
                <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Memory Session</h3>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Turn</p>
                        <p className="text-lg font-bold text-slate-100">{turnLabel}</p>
                        <p className="text-xs text-slate-400">Moves: {moves}</p>
                    </div>
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pairs</p>
                        <p className="text-lg font-bold text-slate-100">Found: {pairs.player}</p>
                        <p className="text-xs text-slate-400">Remaining: {Math.max(0, 8 - pairs.player)}</p>
                    </div>
                </div>

                {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
                <p className={`mt-2 text-xs font-semibold ${gameStatus === "finished" ? "text-brand-400" : "text-slate-200"}`}>{summary}</p>

                <div className="mt-3 rounded-md border border-slate-700 bg-slate-800 p-2.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Companion Chat</p>
                    <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
                        {companionMessages.length ? companionMessages.map((msg, idx) => (
                            <div key={`${idx}-${msg.slice(0, 8)}`} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">
                                {msg}
                            </div>
                        )) : <p className="text-xs text-slate-400">Companion guidance appears here while you play.</p>}
                    </div>

                    <div className="mt-2 flex gap-2">
                        <input
                            value={liveChatInput}
                            onChange={(event) => setLiveChatInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    sendLiveChat();
                                }
                            }}
                            placeholder="Talk to your companion"
                            className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="button"
                            onClick={toggleVoiceTalk}
                            disabled={!activeCompanion || liveChatLoading}
                            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${voiceRecording ? "border-brand-500 bg-brand-500/20 text-brand-200" : "border-slate-600 bg-slate-800 text-slate-100"}`}
                        >
                            {voiceRecording ? `🎤 ${voiceRecordingTime}s` : "🎤 Voice"}
                        </button>
                        <button
                            type="button"
                            onClick={sendLiveChat}
                            disabled={liveChatLoading || !liveChatInput.trim()}
                            className="rounded-md border border-brand-500 bg-brand-500/20 px-3 py-1.5 text-xs font-semibold text-brand-200 disabled:opacity-50"
                        >
                            {liveChatLoading ? "..." : "Send"}
                        </button>
                    </div>
                    {!voiceSupported ? <p className="mt-2 text-xs text-slate-400">Voice talk is not supported in this environment.</p> : null}
                </div>
            </section>
        </div>
    );
}
