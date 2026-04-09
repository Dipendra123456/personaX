import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

const CHESS_DIFFICULTY_RATINGS = [
    { level: 1, rating: 200, label: "New to Chess", depth: 1 },
    { level: 2, rating: 400, label: "Beginner", depth: 2 },
    { level: 3, rating: 600, label: "Novice", depth: 2 },
    { level: 4, rating: 900, label: "Intermediate", depth: 3 },
    { level: 5, rating: 1200, label: "Intermediate II", depth: 4 },
    { level: 6, rating: 1600, label: "Advanced", depth: 5 },
    { level: 7, rating: 2000, label: "Expert", depth: 5 },
    { level: 8, rating: 2400, label: "Master", depth: 5 },
    { level: 9, rating: 2800, label: "Grandmaster", depth: 5 }
];

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const TIME_CONTROLS = [1, 3, 5, 10];

const getDifficultyConfig = (level) => {
    const safeLevel = Number(level);
    return CHESS_DIFFICULTY_RATINGS.find((item) => item.level === safeLevel) || CHESS_DIFFICULTY_RATINGS[2];
};

const getPieceAsset = (piece) => {
    if (!piece) {
        return "";
    }

    const colorPrefix = piece.color === "w" ? "w" : "b";
    const type = piece.type.toLowerCase();
    return `/chess-pieces/${colorPrefix}${type}.svg`;
};

export default function ChessGame({ selectedCompanion, playerName = "You", onGameMessage, difficulty, onDifficultyChange }) {
    const gameRef = useRef(new Chess());
    const [fen, setFen] = useState(gameRef.current.fen());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [gameStatus, setGameStatus] = useState("setup");
    const [colorChoice, setColorChoice] = useState("white");
    const [playerColor, setPlayerColor] = useState("w");
    const [selectedMinutes, setSelectedMinutes] = useState(5);
    const [whiteTime, setWhiteTime] = useState(300);
    const [blackTime, setBlackTime] = useState(300);
    const [companionMessages, setCompanionMessages] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [isAIThinking, setIsAIThinking] = useState(false);

    const companionName = selectedCompanion?.name || "Coach";
    const companionInitial = companionName.trim().charAt(0).toUpperCase() || "C";

    const emitGameMessage = (text) => {
        setCompanionMessages((prev) => [text, ...prev].slice(0, 16));

        if (!onGameMessage) {
            return;
        }

        const prefix = selectedCompanion?.name ? `${selectedCompanion.name}: ` : "";
        onGameMessage(`${prefix}${text}`);
    };

    const board = useMemo(() => {
        const rows = [];
        const game = gameRef.current;
        const board = game.board();
        for (let row = 0; row < 8; row++) {
            rows.push(board[row].map(piece => piece));
        }
        return rows;
    }, [fen]);

    const updateLegalMoves = (square) => {
        const game = gameRef.current;
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map(m => m.to));
    };

    const resetBoardState = () => {
        gameRef.current = new Chess();
        setFen(gameRef.current.fen());
        const initialSeconds = selectedMinutes * 60;
        setWhiteTime(initialSeconds);
        setBlackTime(initialSeconds);
        setCompanionMessages([]);
        setMoveHistory([]);
        setSelectedSquare(null);
        setLastMove(null);
        setLegalMoves([]);
        setIsAIThinking(false);
    };

    const goToSetup = () => {
        resetBoardState();
        setGameStatus("setup");
    };

    const startGame = () => {
        const resolvedPlayerColor = colorChoice === "random"
            ? (Math.random() < 0.5 ? "w" : "b")
            : colorChoice === "black"
                ? "b"
                : "w";

        resetBoardState();
        setGameStatus("playing");
        setPlayerColor(resolvedPlayerColor);

        const diffObj = getDifficultyConfig(difficulty);
        const colorLabel = resolvedPlayerColor === "w" ? "White" : "Black";
        emitGameMessage(`Let's play chess. I'm set to ${diffObj.label}. You are ${colorLabel}.`);

        if (resolvedPlayerColor === "b") {
            emitGameMessage("I will make the first move as White.");
            setTimeout(() => makeAIMove(resolvedPlayerColor), 450);
        } else {
            emitGameMessage("Make your first move.");
        }
    };

    const evaluatePosition = (game) => {
        let score = 0;
        const board = game.board();

        for (let row of board) {
            for (let piece of row) {
                if (piece) {
                    const value = PIECE_VALUES[piece.type];
                    score += piece.color === 'w' ? value : -value;
                }
            }
        }

        return score;
    };

    const minimax = (game, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
        if (depth === 0 || game.isGameOver()) {
            return evaluatePosition(game);
        }

        const moves = game.moves({ verbose: true });

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                game.move(move);
                const eval_ = minimax(game, depth - 1, false, alpha, beta);
                game.undo();
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                game.move(move);
                const eval_ = minimax(game, depth - 1, true, alpha, beta);
                game.undo();
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const getAIMove = (game, depth, aiColor) => {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        let bestMove = moves[0];
        const aiIsWhite = aiColor === "w";
        let bestEval = aiIsWhite ? -Infinity : Infinity;

        for (let move of moves) {
            game.move(move);
            const eval_ = minimax(game, depth - 1, !aiIsWhite);
            game.undo();

            if (aiIsWhite) {
                if (eval_ > bestEval) {
                    bestEval = eval_;
                    bestMove = move;
                }
            } else if (eval_ < bestEval) {
                bestEval = eval_;
                bestMove = move;
            }
        }

        return bestMove;
    };

    const makeAIMove = async (currentPlayerColor = playerColor) => {
        setIsAIThinking(true);

        setTimeout(() => {
            const game = gameRef.current;
            const diffObj = getDifficultyConfig(difficulty);
            const aiColor = currentPlayerColor === "w" ? "b" : "w";
            const move = getAIMove(game, Math.min(diffObj.depth, 5), aiColor);

            if (move) {
                game.move(move);
                setFen(game.fen());
                setLastMove({ from: move.from, to: move.to });
                setMoveHistory((prev) => [...prev, move.san]);

                const comments = [
                    "Your turn now.",
                    "Interesting... let's see your next move.",
                    "I've made my move.",
                    "Your move.",
                    "Can you handle this position?",
                    "Let's see what you do next.",
                ];

                emitGameMessage(comments[Math.floor(Math.random() * comments.length)]);

                if (game.isCheckmate()) {
                    emitGameMessage("Checkmate. I win this round, but that was fun.");
                    setGameStatus("ended");
                } else if (game.isDraw()) {
                    emitGameMessage("Draw game. Nice defense.");
                    setGameStatus("ended");
                } else if (game.isCheck()) {
                    emitGameMessage("Check on your king.");
                }
            }

            setIsAIThinking(false);
        }, 800);
    };

    const handleSquareClick = async (row, col) => {
        if (gameStatus !== "playing" || isAIThinking) return;

        if (gameRef.current.turn() !== playerColor) {
            return;
        }

        const game = gameRef.current;
        const squareName = String.fromCharCode(97 + col) + String(8 - row);

        if (selectedSquare) {
            if (selectedSquare === squareName) {
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }

            const move = game.move({
                from: selectedSquare,
                to: squareName,
                promotion: 'q'
            });

            if (move) {
                setFen(game.fen());
                setLastMove({ from: selectedSquare, to: squareName });
                setMoveHistory((prev) => [...prev, move.san]);
                setSelectedSquare(null);
                setLegalMoves([]);

                if (game.isCheckmate()) {
                    emitGameMessage("Checkmate. You win. Strong finish.");
                    setGameStatus("ended");
                    return;
                } else if (game.isDraw()) {
                    emitGameMessage("Draw game.");
                    setGameStatus("ended");
                    return;
                } else if (game.isCheck()) {
                    emitGameMessage("Nice move. I am in check, responding now.");
                }

                // AI move
                setTimeout(() => makeAIMove(), 500);
            }

            return;
        }

        const piece = game.get(squareName);
        if (piece && piece.color === playerColor) {
            setSelectedSquare(squareName);
            updateLegalMoves(squareName);
        }
    };

    const renderBoard = (interactive) => (
        <div className="relative">
            <div className="absolute left-2 top-2 z-10 flex h-[calc(100%-16px)] flex-col justify-between text-xs font-bold text-[#86a962]">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                    <span key={num}>{num}</span>
                ))}
            </div>

            <div className="absolute bottom-1 left-9 right-2 z-10 flex justify-between text-xs font-bold text-[#86a962]">
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((file) => (
                    <span key={file}>{file}</span>
                ))}
            </div>

            <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-md border-[8px] border-[#262421] bg-[#262421] shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
                {board.map((row, rowIdx) =>
                    row.map((piece, colIdx) => {
                        const squareName = String.fromCharCode(97 + colIdx) + String(8 - rowIdx);
                        const isSelected = selectedSquare === squareName;
                        const isLegal = legalMoves.includes(squareName);
                        const isLastMove = lastMove && (
                            (lastMove.from === squareName || lastMove.to === squareName)
                        );
                        const isLight = (rowIdx + colIdx) % 2 === 0;

                        return (
                            <button
                                key={squareName}
                                onClick={interactive ? () => handleSquareClick(rowIdx, colIdx) : undefined}
                                disabled={!interactive || isAIThinking}
                                className={`aspect-square text-3xl font-bold transition flex items-center justify-center ${interactive && isSelected
                                    ? "ring-inset ring-4 ring-sky-300"
                                    : interactive && isLegal
                                        ? "ring-inset ring-2 ring-sky-200"
                                        : ""
                                    } ${isLastMove
                                        ? "bg-[#cdd26a]"
                                        : isLight
                                            ? "bg-[#eeeed2]"
                                            : "bg-[#769656]"
                                    } ${interactive && !isAIThinking ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
                            >
                                {piece ? (
                                    <img
                                        src={getPieceAsset(piece)}
                                        alt={`${piece.color}${piece.type}`}
                                        draggable={false}
                                        className="h-[72%] w-[72%] select-none drop-shadow-[0_2px_1px_rgba(0,0,0,0.45)]"
                                    />
                                ) : null}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );

    useEffect(() => {
        if (gameStatus !== "playing") {
            return;
        }

        const timer = setInterval(() => {
            const turn = gameRef.current.turn();

            if (turn === "w") {
                setWhiteTime((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameStatus("ended");
                        emitGameMessage(playerColor === "w" ? "Time over. You ran out of time." : "Time over. I ran out of time, you win.");
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                setBlackTime((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameStatus("ended");
                        emitGameMessage(playerColor === "b" ? "Time over. You ran out of time." : "Time over. I ran out of time, you win.");
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStatus, playerColor]);

    const formatClock = (seconds) => {
        const safe = Math.max(0, seconds);
        const mins = Math.floor(safe / 60).toString().padStart(2, "0");
        const secs = (safe % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    if (gameStatus === "setup") {
        const selectedDiff = getDifficultyConfig(difficulty);

        return (
            <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-md border border-slate-800 bg-[#2a2927] p-1.5">
                    <div className="mb-1 rounded bg-[#1b1b1b] px-2 py-1 text-xs font-semibold text-slate-200">
                        {companionName}
                    </div>
                    {renderBoard(false)}
                    <div className="mt-1 rounded bg-[#1b1b1b] px-2 py-1 text-xs font-semibold text-slate-200">
                        {playerName}
                    </div>
                </section>

                <section className="rounded-md border border-slate-800 bg-[#1b1b1b] p-2.5">
                    <h3 className="border-b border-slate-800 pb-2 text-center text-lg font-semibold text-slate-100">Play {companionName}</h3>

                    <div className="mt-2 flex items-start gap-2 rounded-md bg-[#212121] p-2">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-100">
                            {companionInitial}
                        </div>
                        <p className="rounded-md border border-slate-700 bg-[#2b313a] px-2.5 py-2 text-xs leading-relaxed text-slate-100">
                            Welcome! I am {companionName}. Pick your color and rating, then press Play to start our game.
                        </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                        <p className="font-semibold text-slate-200">{selectedDiff.label} ({selectedDiff.rating})</p>
                        <div className="flex items-center gap-1">
                            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your Color</span>
                            {[
                                { id: "white", icon: "♔" },
                                { id: "random", icon: "?" },
                                { id: "black", icon: "♚" }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setColorChoice(item.id)}
                                    className={`flex h-7 w-7 items-center justify-center rounded border text-xs font-bold transition ${item.id === "white"
                                        ? colorChoice === item.id
                                            ? "border-slate-200 bg-slate-100 text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
                                            : "border-slate-500 bg-slate-200 text-slate-900 hover:border-slate-400"
                                        : item.id === "black"
                                            ? colorChoice === item.id
                                                ? "border-slate-400 bg-slate-800 text-slate-50 shadow-[0_0_0_1px_rgba(148,163,184,0.25)]"
                                                : "border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500"
                                            : colorChoice === item.id
                                                ? "border-slate-400 bg-slate-800 text-slate-50"
                                                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                                        }`}
                                >
                                    {item.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Time</p>
                        <div className="flex gap-1.5">
                            {TIME_CONTROLS.map((mins) => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => setSelectedMinutes(mins)}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${selectedMinutes === mins
                                        ? "border-lime-400 bg-lime-500/20 text-lime-200"
                                        : "border-slate-700 bg-slate-900 text-slate-300"
                                        }`}
                                >
                                    {mins}m
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                        {CHESS_DIFFICULTY_RATINGS.map((diff) => (
                            <button
                                key={diff.level}
                                onClick={() => onDifficultyChange?.(diff.level)}
                                className={`w-full rounded-md border px-3 py-2 text-left transition ${difficulty === diff.level
                                    ? "border-lime-400 bg-[#1f2a1a] text-lime-200"
                                    : "border-slate-800 bg-[#171a1f] text-slate-200 hover:bg-[#1d2128]"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-lg font-semibold leading-none">{diff.label}</span>
                                    <span className="text-base font-semibold text-slate-400">({diff.rating})</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={startGame}
                        className="mt-3 w-full rounded-lg bg-lime-600 px-4 py-2.5 text-lg font-bold text-white hover:bg-lime-500"
                    >
                        Play
                    </button>
                </section>
            </div>
        );
    }

    const whiteIsPlayer = playerColor === "w";

    return (
        <div className="mx-auto grid w-full max-w-[1120px] gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-md border border-slate-800 bg-[#2a2927] p-1.5">
                <div className="mb-1 rounded bg-[#1b1b1b] px-2 py-1 text-xs font-semibold text-slate-200">
                    {companionName}
                </div>
                {renderBoard(true)}
                <div className="mt-1 rounded bg-[#1b1b1b] px-2 py-1 text-xs font-semibold text-slate-200">
                    {playerName}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs font-semibold text-slate-200">
                    <span>{getDifficultyConfig(difficulty).label}</span>
                    <button
                        onClick={goToSetup}
                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                        New Game
                    </button>
                </div>
            </section>

            <section className="rounded-md border border-slate-800 bg-[#1b1b1b] p-2.5">
                <h3 className="border-b border-slate-800 pb-2 text-center text-lg font-semibold text-slate-100">Play {companionName}</h3>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-700 bg-[#171a1f] px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">White</p>
                        <p className={`text-xl font-bold ${gameRef.current.turn() === "w" && gameStatus === "playing" ? "text-lime-300" : "text-slate-100"}`}>
                            {formatClock(whiteTime)}
                        </p>
                        <p className="text-xs text-slate-400">{whiteIsPlayer ? "You" : companionName}</p>
                    </div>
                    <div className="rounded-md border border-slate-700 bg-[#171a1f] px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Black</p>
                        <p className={`text-xl font-bold ${gameRef.current.turn() === "b" && gameStatus === "playing" ? "text-lime-300" : "text-slate-100"}`}>
                            {formatClock(blackTime)}
                        </p>
                        <p className="text-xs text-slate-400">{whiteIsPlayer ? companionName : "You"}</p>
                    </div>
                </div>

                <div className="mt-2 rounded-md border border-slate-800 bg-[#171a1f] p-2.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Companion Chat</p>
                    <div className="mt-2 max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
                        {companionMessages.length ? companionMessages.map((msg, idx) => (
                            <div key={`${idx}-${msg.slice(0, 12)}`} className="rounded-md border border-slate-700 bg-[#2b313a] px-2.5 py-2 text-xs text-slate-100">
                                {msg}
                            </div>
                        )) : (
                            <p className="text-xs text-slate-400">Companion messages will appear here during the game.</p>
                        )}
                    </div>
                </div>

                <div className="mt-2 rounded-md border border-slate-800 bg-[#171a1f] p-2.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                        <span className="font-medium">Moves</span>
                        <span className="text-right">{moveHistory.slice(-10).join(", ") || "—"}</span>
                    </div>
                    <div className="mt-2 flex justify-between">
                        <span className="font-medium">Status</span>
                        <span className="text-lime-300">{gameStatus === "ended" ? "Game ended" : isAIThinking ? "Companion is thinking..." : "In progress"}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
