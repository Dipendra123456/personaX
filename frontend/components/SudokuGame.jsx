import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

const SUDOKU_MODES = [
    { level: 1, label: "Easy", notes: "More clues", difficulty: "easy" },
    { level: 3, label: "Medium", notes: "Balanced", difficulty: "medium" },
    { level: 5, label: "Hard", notes: "Fewer clues", difficulty: "hard" },
    { level: 7, label: "Expert", notes: "Tight board", difficulty: "expert" },
    { level: 9, label: "Master", notes: "Very sparse", difficulty: "master" }
];

const TIME_CONTROLS = [5, 10, 15, 20];

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

const formatClock = (seconds) => {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const SUDOKU_THEME = {
    shell: "rounded-md border border-slate-700 bg-slate-900 p-2.5",
    boardContainer: "overflow-hidden rounded-md border border-[#c58a3a] bg-[#2f1d0f]",
    panel: "rounded-md border border-slate-700 bg-slate-900 p-2.5",
    softPanel: "rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs leading-relaxed text-slate-200",
    headerBar: "rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100",
    title: "text-center text-lg font-semibold text-slate-100",
    accentText: "text-sky-300",
    timerText: "text-slate-100",
    squareLight: "bg-[#f7edd6]",
    squareDark: "bg-[#e8d8b7]",
    squareRelated: "bg-[#f7c873]",
    squareSelected: "bg-[#f59e0b]",
    fixedText: "text-[#1f1302]",
    userText: "text-[#7c2d12]",
    button: "rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100",
    buttonActive: "border-sky-400 bg-sky-500/15 text-sky-100",
    buttonPrimary: "mt-3 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-lg font-bold text-white hover:bg-sky-400 disabled:opacity-60",
    hintText: "text-slate-300",
    chip: "rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100",
    chipActive: "border-sky-400 bg-sky-500/15 text-sky-100",
    input: "min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-400",
    send: "rounded-md border border-sky-400 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 disabled:opacity-50",
    voice: "rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100",
    voiceActive: "border-sky-400 bg-sky-500/15 text-sky-100",
    message: "rounded-md border border-slate-600 bg-slate-800 px-2.5 py-2 text-xs text-slate-100",
    info: "text-xs uppercase tracking-[0.2em] text-slate-400"
};

export default function SudokuGame({ selectedCompanion, playerName = "You", onGameMessage, difficulty, onDifficultyChange }) {
    const token = useCompanionStore((state) => state.token);
    const storeSelectedCompanion = useCompanionStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [gameStatus, setGameStatus] = useState("setup");
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
    const [isLoading, setIsLoading] = useState(false);
    const [companionMessages, setCompanionMessages] = useState([]);
    const [liveChatInput, setLiveChatInput] = useState("");
    const [liveChatLoading, setLiveChatLoading] = useState(false);
    const [voiceTalkEnabled, setVoiceTalkEnabled] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
    const [voiceSupported, setVoiceSupported] = useState(true);
    const [error, setError] = useState("");
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const voiceTimerRef = useRef(null);
    const recordingMimeTypeRef = useRef("audio/webm");

    const companionName = activeCompanion?.name || "Coach";
    const companionInitial = companionName.trim().charAt(0).toUpperCase() || "C";
    const selectedDiff = useMemo(() => SUDOKU_MODES.find((item) => item.level === Number(difficulty)) || SUDOKU_MODES[1], [difficulty]);

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
        setCompanionMessages((prev) => [
            ...prev,
            `${playerName}: ${message}`
        ].slice(-16));
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
                setVoiceTalkEnabled(false);
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
        if (!state) {
            return;
        }

        setBoard(state.board || Array.from({ length: 9 }, () => Array(9).fill(0)));
        setFixedMask(state.fixedMask || Array.from({ length: 9 }, () => Array(9).fill(false)));
        setMistakes(Number(state.mistakes) || 0);
        setMaxMistakes(Number(state.maxMistakes) || 3);
        setHintsUsed(Number(state.hintsUsed) || 0);
        setIsPaused(Boolean(state.isPaused));

        if (state.status === "won") {
            setGameStatus("won");
        } else if (state.status === "finished") {
            setGameStatus("ended");
        }
    };

    const runAction = async (movePayload) => {
        if (!sessionId || isLoading) {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await api.moveGame({ sessionId, move: movePayload }, token);
            syncState(result?.session?.state);
            if (result?.aiMove?.message) {
                emitGameMessage(result.aiMove.message);
            }
        } catch (err) {
            setError(err.message || "Could not apply move");
        } finally {
            setIsLoading(false);
        }
    };

    const startSudoku = async () => {
        if (!activeCompanion?._id) {
            setError("Pick a companion before starting Sudoku.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const session = await api.startGame({
                companionId: activeCompanion._id,
                gameType: "sudoku",
                difficulty: mapDifficultyToEnum(Number(difficulty) || 3)
            }, token);

            setSessionId(session._id);
            setSelectedCell(null);
            setSecondsLeft(selectedMinutes * 60);
            setGameStatus("playing");
            syncState(session.state);
            emitGameMessage(`Sudoku started on ${selectedDiff.label}. I will coach you through this puzzle.`);
        } catch (err) {
            setError(err.message || "Could not start Sudoku");
        } finally {
            setIsLoading(false);
        }
    };

    const resetToSetup = () => {
        setGameStatus("setup");
        setSessionId(null);
        setSelectedCell(null);
        setBoard(Array.from({ length: 9 }, () => Array(9).fill(0)));
        setFixedMask(Array.from({ length: 9 }, () => Array(9).fill(false)));
        setMistakes(0);
        setHintsUsed(0);
        setIsPaused(false);
        setSecondsLeft(selectedMinutes * 60);
        setCompanionMessages([]);
        setLiveChatInput("");
        setVoiceTalkEnabled(false);
        setVoiceRecording(false);
        setVoiceRecordingTime(0);
        setError("");
    };

    useEffect(() => {
        if (gameStatus !== "playing" || isPaused) {
            return;
        }

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameStatus("ended");
                    emitGameMessage("Time is over. Start a new puzzle and try again.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStatus, isPaused]);

    const cellIsSelected = (row, col) => selectedCell?.row === row && selectedCell?.col === col;
    const cellIsRelated = (row, col) => {
        if (!selectedCell) {
            return false;
        }

        const sameRow = selectedCell.row === row;
        const sameCol = selectedCell.col === col;
        const sameBox = Math.floor(selectedCell.row / 3) === Math.floor(row / 3)
            && Math.floor(selectedCell.col / 3) === Math.floor(col / 3);

        return sameRow || sameCol || sameBox;
    };

    const setValue = (value) => {
        if (gameStatus !== "playing" || !selectedCell) {
            return;
        }

        runAction({ action: "set-value", row: selectedCell.row, col: selectedCell.col, value });
    };

    const eraseValue = () => {
        if (gameStatus !== "playing" || !selectedCell) {
            return;
        }

        runAction({ action: "erase", row: selectedCell.row, col: selectedCell.col });
    };

    const requestHint = () => {
        if (gameStatus !== "playing") {
            return;
        }

        if (selectedCell) {
            runAction({ action: "hint", row: selectedCell.row, col: selectedCell.col });
            return;
        }

        runAction({ action: "hint" });
    };

    const undoMove = () => {
        if (gameStatus !== "playing") {
            return;
        }

        runAction({ action: "undo" });
    };

    const togglePause = () => {
        if (gameStatus !== "playing") {
            return;
        }

        runAction({ action: "pause" });
    };

    const renderBoard = (interactive) => (
        <div className={SUDOKU_THEME.boardContainer}>
            <div className="grid grid-cols-9">
                {board.map((rowValues, row) => rowValues.map((value, col) => {
                    const fixed = Boolean(fixedMask[row]?.[col]);
                    const selected = cellIsSelected(row, col);
                    const related = cellIsRelated(row, col);
                    const inAltSquare = (row + col) % 2 === 0;
                    const blockRight = col === 2 || col === 5;
                    const blockBottom = row === 2 || row === 5;

                    return (
                        <button
                            key={`${row}-${col}`}
                            type="button"
                            disabled={!interactive || gameStatus !== "playing" || isPaused}
                            onClick={() => {
                                if (!interactive) {
                                    return;
                                }
                                setSelectedCell({ row, col });
                            }}
                            className={`aspect-square border text-center text-lg font-bold transition ${inAltSquare ? SUDOKU_THEME.squareLight : SUDOKU_THEME.squareDark} ${selected
                                ? SUDOKU_THEME.squareSelected
                                : related
                                    ? SUDOKU_THEME.squareRelated
                                    : ""} ${fixed ? SUDOKU_THEME.fixedText : SUDOKU_THEME.userText} ${blockRight ? "border-r-2 border-r-[#c58a3a]" : "border-r border-r-[#d6c49b]"} ${blockBottom ? "border-b-2 border-b-[#c58a3a]" : "border-b border-b-[#d6c49b]"}`}
                        >
                            {value || ""}
                        </button>
                    );
                }))}
            </div>
        </div>
    );

    if (gameStatus === "setup") {
        return (
            <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-md border border-slate-700 bg-slate-900 p-1.5">
                    <div className={SUDOKU_THEME.headerBar}>{companionName}</div>
                    {renderBoard(false)}
                    <div className={`mt-1 ${SUDOKU_THEME.headerBar}`}>{playerName}</div>
                </section>

                <section className={SUDOKU_THEME.shell}>
                    <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Play Sudoku with {companionName}</h3>

                    <div className="mt-2 flex items-start gap-2 rounded-md bg-slate-800 p-2">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{companionInitial}</div>
                        <p className={SUDOKU_THEME.softPanel}>
                            Pick a Sudoku mode and session timer, then start. I will coach you while you solve.
                        </p>
                    </div>

                    <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Session Timer</p>
                        <div className="flex gap-1.5">
                            {TIME_CONTROLS.map((mins) => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => {
                                        setSelectedMinutes(mins);
                                        setSecondsLeft(mins * 60);
                                    }}
                                    className={`${SUDOKU_THEME.chip} ${selectedMinutes === mins ? SUDOKU_THEME.chipActive : ""}`}
                                >
                                    {mins}m
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                        {SUDOKU_MODES.map((item) => (
                            <button
                                key={item.level}
                                type="button"
                                onClick={() => onDifficultyChange?.(item.level)}
                                className={`w-full rounded-md border px-3 py-2 text-left transition ${Number(difficulty) === item.level
                                    ? "border-sky-400 bg-sky-500/15 text-slate-100"
                                    : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-base font-semibold">{item.label}</span>
                                    <span className="text-xs text-slate-400">{item.notes}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

                    <button
                        type="button"
                        onClick={startSudoku}
                        disabled={isLoading}
                        className={SUDOKU_THEME.buttonPrimary}
                    >
                        {isLoading ? "Starting..." : "Play"}
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-md border border-slate-700 bg-slate-900 p-1.5">
                <div className={SUDOKU_THEME.headerBar}>{companionName}</div>
                {renderBoard(true)}
                <div className={`mt-1 ${SUDOKU_THEME.headerBar}`}>{playerName}</div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs font-semibold text-[#f8ead1]">
                    <span>{selectedDiff.label}</span>
                    <button
                        type="button"
                        onClick={resetToSetup}
                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
                    >
                        New Game
                    </button>
                </div>
            </section>

            <section className={SUDOKU_THEME.shell}>
                <h3 className="border-b border-slate-700 pb-2 text-center text-lg font-semibold text-slate-100">Sudoku Session</h3>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className={SUDOKU_THEME.info}>Timer</p>
                        <p className={`text-xl font-bold ${secondsLeft <= 30 && gameStatus === "playing" ? "text-sky-300" : SUDOKU_THEME.timerText}`}>{formatClock(secondsLeft)}</p>
                        <p className="text-xs text-slate-400">{isPaused ? "Paused" : "Running"}</p>
                    </div>
                    <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                        <p className={SUDOKU_THEME.info}>Mistakes</p>
                        <p className="text-xl font-bold text-slate-100">{mistakes}/{maxMistakes}</p>
                        <p className="text-xs text-slate-400">Hints used: {hintsUsed}</p>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setValue(value)}
                            className="rounded-md border border-slate-600 bg-slate-800 py-2 text-sm font-semibold text-slate-100 hover:border-sky-400"
                        >
                            {value}
                        </button>
                    ))}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={eraseValue} className={SUDOKU_THEME.button}>Erase</button>
                    <button type="button" onClick={undoMove} className={SUDOKU_THEME.button}>Undo</button>
                    <button type="button" onClick={requestHint} className={SUDOKU_THEME.button}>Hint</button>
                    <button type="button" onClick={togglePause} className={SUDOKU_THEME.button}>
                        {isPaused ? "Resume" : "Pause"}
                    </button>
                </div>

                {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

                <div className="mt-2 rounded-md border border-slate-700 bg-slate-800 p-2.5">
                    <p className={SUDOKU_THEME.info}>Companion Chat</p>
                    <div className="mt-2 max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
                        {companionMessages.length ? companionMessages.map((msg, idx) => (
                            <div key={`${idx}-${msg.slice(0, 10)}`} className="rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">
                                {msg}
                            </div>
                        )) : (
                            <p className="text-xs text-slate-400">Companion guidance appears here while you solve.</p>
                        )}
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
                            className={SUDOKU_THEME.input}
                        />
                        <button
                            type="button"
                            onClick={toggleVoiceTalk}
                            disabled={!activeCompanion || liveChatLoading}
                            className={`${SUDOKU_THEME.voice} ${voiceRecording ? SUDOKU_THEME.voiceActive : ""}`}
                        >
                            {voiceRecording ? `🎤 ${voiceRecordingTime}s` : "🎤 Voice"}
                        </button>
                        <button
                            type="button"
                            onClick={sendLiveChat}
                            disabled={liveChatLoading || !liveChatInput.trim()}
                            className={SUDOKU_THEME.send}
                        >
                            {liveChatLoading ? "..." : "Send"}
                        </button>
                    </div>
                </div>

                <p className={`mt-2 text-xs font-semibold ${gameStatus === "won" ? "text-[#fbbf24]" : gameStatus === "ended" ? "text-[#fb923c]" : "text-[#f8ead1]"}`}>
                    {gameStatus === "won" ? "Puzzle solved." : gameStatus === "ended" ? "Round finished." : isLoading ? "Applying move..." : voiceRecording ? "Recording voice..." : "In progress"}
                </p>
            </section>
        </div>
    );
}
