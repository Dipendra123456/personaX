import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

const OTHELLO_MODES = [
    { level: 1, label: "Easy", notes: "Loose play", difficulty: "easy" },
    { level: 3, label: "Medium", notes: "Balanced", difficulty: "medium" },
    { level: 5, label: "Hard", notes: "Corner-aware", difficulty: "hard" },
    { level: 7, label: "Expert", notes: "Stronger board control", difficulty: "expert" },
    { level: 9, label: "Master", notes: "Best available", difficulty: "master" }
];

const mapDifficultyToEnum = (difficulty) => {
    if (difficulty <= 1) {
        return "easy";
    }
    if (difficulty <= 3) {
        return "medium";
    }
    if (difficulty <= 5) {
        return "hard";
    }
    if (difficulty <= 7) {
        return "expert";
    }
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

export default function OthelloGame({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useCompanionStore((state) => state.token);
    const storeSelectedCompanion = useCompanionStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [gameStatus, setGameStatus] = useState("setup");
    const [sessionId, setSessionId] = useState(null);
    const [board, setBoard] = useState(createEmptyBoard());
    const [legalMoves, setLegalMoves] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("black");
    const [scores, setScores] = useState({ black: 2, white: 2 });
    const [lastMove, setLastMove] = useState(null);
    const [winner, setWinner] = useState(null);
    const [companionMessages, setCompanionMessages] = useState([]);
    const [liveChatInput, setLiveChatInput] = useState("");
    const [liveChatLoading, setLiveChatLoading] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
    const [voiceSupported, setVoiceSupported] = useState(true);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const voiceTimerRef = useRef(null);
    const recordingMimeTypeRef = useRef("audio/webm");
    const selectedMode = useMemo(() => OTHELLO_MODES.find((item) => item.level === Number(difficulty)) || OTHELLO_MODES[1], [difficulty]);

    const emitGameMessage = (text) => {
        setCompanionMessages((prev) => [text, ...prev].slice(0, 16));
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

    const syncState = (state) => {
        if (!state) {
            return;
        }

        setBoard(state.board || createEmptyBoard());
        setLegalMoves(state.legalMoves || []);
        setCurrentPlayer(state.currentPlayer || "black");
        setScores(state.scores || { black: 0, white: 0 });
        setLastMove(state.lastMove || null);
        setWinner(state.winner || null);

        if (state.status === "finished") {
            setGameStatus("finished");
        }
    };

    const startGame = async () => {
        if (!activeCompanion?._id) {
            setError("Pick a companion before starting Othello.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "othello",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);

            setSessionId(session._id);
            setGameStatus("playing");
            syncState(session.state);
            emitGameMessage(`Othello started on ${selectedMode.label}. You are black.`);
        } catch (err) {
            setError(err.message || "Could not start Othello");
        } finally {
            setIsLoading(false);
        }
    };

    const sendMove = async (move) => {
        if (!sessionId || isLoading || gameStatus !== "playing") {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await api.moveGame({ sessionId, move }, token);
            syncState(result?.session?.state);
            if (result?.aiMove?.message) {
                emitGameMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply Othello move");
        } finally {
            setIsLoading(false);
        }
    };

    const placeDisc = (row, col) => {
        if (gameStatus !== "playing") {
            return;
        }
        sendMove({ action: "place", row, col });
    };

    const passTurn = () => {
        if (gameStatus !== "playing") {
            return;
        }
        sendMove({ action: "pass" });
    };

    const resetToSetup = () => {
        setGameStatus("setup");
        setSessionId(null);
        setBoard(createEmptyBoard());
        setLegalMoves([]);
        setCurrentPlayer("black");
        setScores({ black: 2, white: 2 });
        setLastMove(null);
        setWinner(null);
        setCompanionMessages([]);
        setLiveChatInput("");
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    const isLegalMove = (row, col) => legalMoves.some((move) => move.row === row && move.col === col);

    const renderCell = (row, col) => {
        const value = board[row]?.[col] || 0;
        const legal = isLegalMove(row, col);
        const selected = lastMove?.row === row && lastMove?.col === col;
        const base = (row + col) % 2 === 0 ? "bg-[#0f7a36]" : "bg-[#0d6830]";

        return (
            <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => placeDisc(row, col)}
                disabled={gameStatus !== "playing" || isLoading || value !== 0 || !legal}
                className={`relative aspect-square border border-[#0b4f25] transition ${base} ${selected ? "ring-2 ring-amber-300" : ""} ${legal ? "hover:brightness-110" : ""}`}
            >
                {value !== 0 ? (
                    <span
                        className={`absolute inset-[18%] rounded-full border shadow-[0_6px_12px_rgba(0,0,0,0.35)] ${value === 1 ? "border-[#222] bg-[#111]" : "border-[#f8fafc] bg-[#f8fafc]"}`}
                    />
                ) : legal ? (
                    <span className="absolute inset-[40%] rounded-full bg-white/70" />
                ) : null}
            </button>
        );
    };

    if (gameStatus === "setup") {
        return (
            <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-md border border-slate-800 bg-slate-900 p-2">
                    <div className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{activeCompanion?.name || "Coach"}</div>
                    <div className="mt-2 overflow-hidden rounded-md border border-[#0b4f25] bg-[#14532d] p-2">
                        <div className="grid grid-cols-8 gap-0.5">{board.map((row, rowIndex) => row.map((cell, colIndex) => renderCell(rowIndex, colIndex)))}</div>
                    </div>
                    <div className="mt-1 rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{playerName}</div>
                </section>

                <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
                    <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Play Othello with {activeCompanion?.name || "Coach"}</h3>
                    <p className="mt-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs leading-relaxed text-slate-300">
                        Classic Othello rules: place a disc to trap and flip the opponent's discs in any direction.
                    </p>

                    <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI strength</p>
                        <div className="space-y-2">
                            {OTHELLO_MODES.map((mode) => (
                                <button
                                    key={mode.level}
                                    type="button"
                                    onClick={() => onDifficultyChange?.(mode.level)}
                                    className={`w-full rounded-md border px-3 py-2 text-left transition ${Number(difficulty) === mode.level
                                        ? "border-emerald-400 bg-emerald-500/15 text-slate-100"
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
                    </div>

                    {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

                    <button
                        type="button"
                        onClick={startGame}
                        disabled={isLoading}
                        className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-lg font-bold text-white hover:bg-emerald-400 disabled:opacity-60"
                    >
                        {isLoading ? "Starting..." : "Play"}
                    </button>
                </section>
            </div>
        );
    }

    const playerTurnText = currentPlayer === "black" ? `${playerName}'s turn` : `${activeCompanion?.name || "Coach"}'s turn`;
    const gameSummary = winner
        ? winner === "draw"
            ? "The match ended in a draw."
            : `${winner === "black" ? playerName : activeCompanion?.name || "Coach"} won the match.`
        : currentPlayer === "black"
            ? "Your turn. Choose a legal square."
            : "Companion is thinking...";

    return (
        <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <div className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{activeCompanion?.name || "Coach"}</div>
                <div className="mt-2 overflow-hidden rounded-md border border-[#0b4f25] bg-[#14532d] p-1.5">
                    <div className="grid grid-cols-8 gap-0.5">
                        {board.map((row, rowIndex) => row.map((cell, colIndex) => renderCell(rowIndex, colIndex)))}
                    </div>
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
                <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Othello Session</h3>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Turn</p>
                        <p className="text-lg font-bold text-slate-100">{playerTurnText}</p>
                        <p className="text-xs text-slate-400">{gameStatus === "finished" ? "Finished" : currentPlayer === "black" ? "You play black" : "Companion plays white"}</p>
                    </div>
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Score</p>
                        <p className="text-lg font-bold text-slate-100">You {scores.black} - {scores.white} Coach</p>
                        <p className="text-xs text-slate-400">Legal moves: {legalMoves.length}</p>
                    </div>
                </div>

                <div className="mt-2 flex gap-2">
                    <button
                        type="button"
                        onClick={passTurn}
                        disabled={gameStatus !== "playing" || legalMoves.length > 0 || isLoading}
                        className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-50"
                    >
                        Pass
                    </button>
                    <button
                        type="button"
                        onClick={() => emitGameMessage(`Current score is ${scores.black} to ${scores.white}.`)}
                        className="rounded-md border border-emerald-400 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100"
                    >
                        Check Score
                    </button>
                </div>

                {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

                <p className={`mt-2 text-xs font-semibold ${gameStatus === "finished" ? "text-emerald-300" : "text-slate-200"}`}>{gameSummary}</p>

                <div className="mt-3 rounded-md border border-slate-700 bg-slate-800 p-2.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Companion Chat</p>
                    <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto pr-1">
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
                            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${voiceRecording ? "border-emerald-400 bg-emerald-500/15 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100"}`}
                        >
                            {voiceRecording ? `🎤 ${voiceRecordingTime}s` : "🎤 Voice"}
                        </button>
                        <button
                            type="button"
                            onClick={sendLiveChat}
                            disabled={liveChatLoading || !liveChatInput.trim()}
                            className="rounded-md border border-emerald-400 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50"
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
