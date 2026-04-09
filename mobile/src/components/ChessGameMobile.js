import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../constants/colors";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";

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
const TIME_CONTROLS = [1, 3, 5, 10, 15];
const PIECE_SYMBOLS = {
    wp: "♙",
    wn: "♘",
    wb: "♗",
    wr: "♖",
    wq: "♕",
    wk: "♔",
    bp: "♟",
    bn: "♞",
    bb: "♝",
    br: "♜",
    bq: "♛",
    bk: "♚"
};

const getDifficultyConfig = (level) => CHESS_DIFFICULTY_RATINGS.find((item) => item.level === Number(level)) || CHESS_DIFFICULTY_RATINGS[2];

const pieceKey = (piece) => `${piece.color}${piece.type}`;

export default function ChessGameMobile({ selectedCompanion, playerName = "You", difficulty, onDifficultyChange, onGameMessage }) {
    const token = useAppStore((state) => state.token);
    const storeSelectedCompanion = useAppStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [game] = useState(() => new Chess());
    const [fen, setFen] = useState(game.fen());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [gameStatus, setGameStatus] = useState("setup");
    const [colorChoice, setColorChoice] = useState("white");
    const [playerColor, setPlayerColor] = useState("w");
    const [selectedMinutes, setSelectedMinutes] = useState(5);
    const [whiteTime, setWhiteTime] = useState(300);
    const [blackTime, setBlackTime] = useState(300);
    const [chatMessages, setChatMessages] = useState([]);
    const [liveChatInput, setLiveChatInput] = useState("");
    const [liveChatLoading, setLiveChatLoading] = useState(false);
    const [voiceTalkEnabled, setVoiceTalkEnabled] = useState(false);
    const [moveHistory, setMoveHistory] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const chatScrollRef = useRef(null);

    const companionName = activeCompanion?.name || "your companion";
    const companionInitial = companionName.trim().charAt(0).toUpperCase() || "C";

    const board = useMemo(() => game.board(), [fen, game]);

    const emitGameMessage = (text) => {
        setChatMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.kind === "game" && last.content === text) {
                return prev;
            }
            return [...prev, { role: "assistant", content: text, kind: "game" }].slice(-40);
        });
        onGameMessage?.(`${activeCompanion?.name ? `${activeCompanion.name}: ` : ""}${text}`);
    };

    const sendLiveChat = async (messageText) => {
        const message = messageText.trim();
        if (!message || !activeCompanion || liveChatLoading) {
            return;
        }

        setLiveChatInput("");
        setChatMessages((prev) => [...prev, { role: "user", content: message, kind: "chat" }].slice(-40));
        setLiveChatLoading(true);

        try {
            const response = await api.chat({ companionId: activeCompanion._id, message }, token);
            setChatMessages((prev) => [
                ...prev,
                { role: "assistant", content: response.reply || response.message || "...", kind: "chat" }
            ].slice(-40));
        } catch (err) {
            setChatMessages((prev) => [...prev, { role: "assistant", content: err.message || "Could not send message", kind: "chat" }].slice(-40));
        } finally {
            setLiveChatLoading(false);
        }
    };

    useEffect(() => {
        if (!chatScrollRef.current) {
            return;
        }
        chatScrollRef.current.scrollToEnd({ animated: true });
    }, [chatMessages]);

    const evaluatePosition = (boardState) => {
        let score = 0;
        for (const row of boardState) {
            for (const piece of row) {
                if (piece) {
                    const value = PIECE_VALUES[piece.type] || 0;
                    score += piece.color === "w" ? value : -value;
                }
            }
        }
        return score;
    };

    const minimax = (depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
        if (depth === 0 || game.isGameOver()) {
            return evaluatePosition(game.board());
        }

        const moves = game.moves({ verbose: true });
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evalScore = minimax(depth - 1, false, alpha, beta);
                game.undo();
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        }

        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evalScore = minimax(depth - 1, true, alpha, beta);
            game.undo();
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    };

    const getAIMove = (depth, aiColor) => {
        const moves = game.moves({ verbose: true });
        if (!moves.length) return null;

        let bestMove = moves[0];
        const aiIsWhite = aiColor === "w";
        let bestEval = aiIsWhite ? -Infinity : Infinity;

        for (const move of moves) {
            game.move(move);
            const evalScore = minimax(depth - 1, !aiIsWhite);
            game.undo();

            if (aiIsWhite ? evalScore > bestEval : evalScore < bestEval) {
                bestEval = evalScore;
                bestMove = move;
            }
        }

        return bestMove;
    };

    const resetBoardState = () => {
        game.reset();
        setFen(game.fen());
        const initialSeconds = selectedMinutes * 60;
        setWhiteTime(initialSeconds);
        setBlackTime(initialSeconds);
        setChatMessages([]);
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

    const makeAIMove = () => {
        setIsAIThinking(true);
        setTimeout(() => {
            const diffObj = getDifficultyConfig(difficulty);
            const aiColor = playerColor === "w" ? "b" : "w";
            const move = getAIMove(Math.min(diffObj.depth, 5), aiColor);

            if (move) {
                game.move(move);
                setFen(game.fen());
                setLastMove({ from: move.from, to: move.to });
                setMoveHistory((prev) => [...prev, move.san]);
                emitGameMessage("Your turn now.");

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
        }, 650);
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
            setTimeout(() => makeAIMove(), 450);
        } else {
            emitGameMessage("Make your first move.");
        }
    };

    const updateLegalMoves = (square) => {
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((move) => move.to));
    };

    const handleSquarePress = (row, col) => {
        if (gameStatus !== "playing" || isAIThinking) {
            return;
        }

        if (game.turn() !== playerColor) {
            return;
        }

        const squareName = String.fromCharCode(97 + col) + String(8 - row);
        if (selectedSquare) {
            if (selectedSquare === squareName) {
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }

            const selectedPiece = game.get(squareName);
            if (selectedPiece && selectedPiece.color === playerColor) {
                setSelectedSquare(squareName);
                updateLegalMoves(squareName);
                return;
            }

            const move = game.move({ from: selectedSquare, to: squareName, promotion: "q" });
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
                }

                if (game.isDraw()) {
                    emitGameMessage("Draw game.");
                    setGameStatus("ended");
                    return;
                }

                if (game.isCheck()) {
                    emitGameMessage("Nice move. I am in check, responding now.");
                }

                setTimeout(() => makeAIMove(), 500);
            } else {
                emitGameMessage("That move is not legal. Try a highlighted square.");
            }
            return;
        }

        const piece = game.get(squareName);
        if (piece && piece.color === playerColor) {
            setSelectedSquare(squareName);
            updateLegalMoves(squareName);
        }
    };

    useEffect(() => {
        if (gameStatus !== "playing") {
            return;
        }

        const timer = setInterval(() => {
            const turn = game.turn();
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
        const mins = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, "0");
        const secs = (Math.max(0, seconds) % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const whiteIsPlayer = playerColor === "w";

    const renderBoard = (interactive) => (
        <View style={styles.boardWrap}>
            {board.map((row, rowIdx) => (
                <View key={`row-${rowIdx}`} style={styles.boardRow}>
                    {row.map((piece, colIdx) => {
                        const squareName = String.fromCharCode(97 + colIdx) + String(8 - rowIdx);
                        const isSelected = selectedSquare === squareName;
                        const isLegal = legalMoves.includes(squareName);
                        const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
                        const isLight = (rowIdx + colIdx) % 2 === 0;
                        return (
                            <Pressable
                                key={squareName}
                                onPress={interactive ? () => handleSquarePress(rowIdx, colIdx) : undefined}
                                disabled={!interactive || isAIThinking}
                                style={[
                                    styles.square,
                                    isLight ? styles.lightSquare : styles.darkSquare,
                                    isLastMove && styles.lastMove,
                                    isSelected && styles.selectedSquare,
                                    isLegal && styles.legalSquare
                                ]}
                            >
                                <Text style={styles.pieceText}>{piece ? PIECE_SYMBOLS[pieceKey(piece)] : ""}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );

    if (gameStatus === "setup") {
        const selectedDiff = getDifficultyConfig(difficulty);
        return (
            <View style={styles.wrap}>
                <Text style={styles.sectionLabel}>Game Zone</Text>
                <Text style={styles.title}>Play against {companionName}</Text>
                <Text style={styles.subtitle}>Choose a color, pick a rating, then start the match.</Text>

                <View style={styles.card}>
                    <View style={styles.bar} />
                    {renderBoard(false)}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{selectedDiff.label} ({selectedDiff.rating})</Text>
                    <Text style={styles.smallText}>Your Color</Text>
                    <View style={styles.rowWrap}>
                        {[
                            { id: "white", label: "♔" },
                            { id: "random", label: "?" },
                            { id: "black", label: "♚" }
                        ].map((item) => (
                            <Pressable key={item.id} onPress={() => setColorChoice(item.id)} style={[styles.choiceBtn, colorChoice === item.id && styles.choiceBtnActive]}>
                                <Text style={styles.choiceText}>{item.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={[styles.smallText, { marginTop: 10 }]}>Time</Text>
                    <View style={styles.rowWrap}>
                        {TIME_CONTROLS.map((mins) => (
                            <Pressable key={mins} onPress={() => setSelectedMinutes(mins)} style={[styles.choiceBtn, selectedMinutes === mins && styles.choiceBtnActive]}>
                                <Text style={styles.choiceText}>{mins}m</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={[styles.smallText, { marginTop: 10 }]}>Difficulty</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        <View style={styles.rowWrap}>
                            {CHESS_DIFFICULTY_RATINGS.map((diff) => (
                                <Pressable key={diff.level} onPress={() => onDifficultyChange?.(diff.level)} style={[styles.diffBtn, difficulty === diff.level && styles.diffBtnActive]}>
                                    <Text style={styles.diffText}>{diff.label}</Text>
                                    <Text style={styles.diffRating}>{diff.rating}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    <Pressable onPress={startGame} style={styles.playBtn}>
                        <Text style={styles.playText}>Play</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <Text style={styles.sectionLabel}>Game Zone</Text>
            <Text style={styles.title}>Play against {companionName}</Text>
            <Text style={styles.subtitle}>{getDifficultyConfig(difficulty).label} rating {getDifficultyConfig(difficulty).rating}</Text>

            <View style={styles.card}>
                <Text style={styles.playerLabel}>{companionName}</Text>
                {renderBoard(true)}
                <Text style={styles.playerLabel}>{playerName}</Text>
                <View style={styles.rowBetween}>
                    <Text style={styles.smallText}>{getDifficultyConfig(difficulty).label}</Text>
                    <Pressable onPress={goToSetup} style={styles.smallAction}><Text style={styles.smallActionText}>New Game</Text></Pressable>
                </View>
            </View>

            <View style={styles.card}>
                <View style={styles.timerGrid}>
                    <View style={styles.timerBox}>
                        <Text style={styles.smallText}>White</Text>
                        <Text style={styles.timerText}>{formatClock(whiteTime)}</Text>
                        <Text style={styles.smallText}>{whiteIsPlayer ? "You" : companionName}</Text>
                    </View>
                    <View style={styles.timerBox}>
                        <Text style={styles.smallText}>Black</Text>
                        <Text style={styles.timerText}>{formatClock(blackTime)}</Text>
                        <Text style={styles.smallText}>{whiteIsPlayer ? companionName : "You"}</Text>
                    </View>
                </View>

                <View style={styles.liveChatCard}>
                    <Text style={styles.smallText}>Companion Chat</Text>
                    <Text style={styles.liveChatHint}>Talk to {companionName} while the game is running.</Text>

                    <View style={styles.quickPillsRow}>
                        {["your move", "good luck", "what do you think?", "nice one"].map((prompt) => (
                            <Pressable key={prompt} style={styles.quickPill} onPress={() => sendLiveChat(prompt)}>
                                <Text style={styles.quickPillText}>{prompt}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <ScrollView
                        ref={chatScrollRef}
                        style={styles.liveChatMessages}
                        contentContainerStyle={styles.liveChatMessagesContent}
                        showsVerticalScrollIndicator
                        nestedScrollEnabled
                    >
                        {chatMessages.length ? chatMessages.map((message, index) => (
                            <View
                                key={`${index}-${message.content.slice(0, 12)}`}
                                style={[styles.liveChatBubble, message.role === "user" ? styles.liveUserBubble : styles.liveAiBubble]}
                            >
                                <Text style={styles.liveChatBubbleText}>{message.content}</Text>
                            </View>
                        )) : (
                            <Text style={styles.placeholderText}>Send a message to your companion here.</Text>
                        )}
                    </ScrollView>

                    <View style={styles.liveChatInputRow}>
                        <Pressable
                            style={[styles.voiceBtn, voiceTalkEnabled && styles.voiceBtnActive]}
                            onPress={() => {
                                setVoiceTalkEnabled((prev) => !prev);
                                setChatMessages((prev) => [
                                    ...prev,
                                    {
                                        role: "assistant",
                                        content: !voiceTalkEnabled
                                            ? "Voice talk mode enabled. Tap and hold to speak (coming in next update)."
                                            : "Voice talk mode disabled.",
                                        kind: "game"
                                    }
                                ].slice(-40));
                            }}
                        >
                            <Text style={styles.voiceBtnText}>🎤</Text>
                        </Pressable>
                        <TextInput
                            style={styles.liveChatInput}
                            placeholder="Message your companion..."
                            placeholderTextColor={colors.textMuted}
                            value={liveChatInput}
                            onChangeText={setLiveChatInput}
                            multiline={false}
                            returnKeyType="send"
                            blurOnSubmit
                            onSubmitEditing={() => sendLiveChat(liveChatInput)}
                        />
                        <Pressable
                            style={[styles.liveChatSendBtn, (!liveChatInput.trim() || liveChatLoading) && { opacity: 0.6 }]}
                            onPress={() => sendLiveChat(liveChatInput)}
                            disabled={!liveChatInput.trim() || liveChatLoading}
                        >
                            {liveChatLoading ? (
                                <ActivityIndicator color={colors.buttonText} size="small" />
                            ) : (
                                <Text style={styles.liveChatSendText}>Send</Text>
                            )}
                        </Pressable>
                    </View>
                </View>

                <View style={styles.rowBetween}>
                    <Text style={styles.smallText}>Moves</Text>
                    <Text style={styles.smallText}>{moveHistory.slice(-10).join(", ") || "—"}</Text>
                </View>
                <View style={styles.rowBetween}>
                    <Text style={styles.smallText}>Status</Text>
                    <Text style={styles.statusText}>{gameStatus === "ended" ? "Game ended" : isAIThinking ? "Companion is thinking..." : "In progress"}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 32 },
    sectionLabel: { color: colors.accent, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "800" },
    title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
    subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
    card: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 12 },
    bar: { height: 5, width: 56, backgroundColor: colors.accent, borderRadius: 99, marginBottom: 8 },
    boardWrap: { borderWidth: 6, borderColor: "#262421", borderRadius: 10, overflow: "hidden" },
    boardRow: { flexDirection: "row" },
    square: { aspectRatio: 1, flex: 1, alignItems: "center", justifyContent: "center" },
    lightSquare: { backgroundColor: "#eeeed2" },
    darkSquare: { backgroundColor: "#769656" },
    selectedSquare: { borderWidth: 3, borderColor: colors.accentSecondary },
    legalSquare: { borderWidth: 2, borderColor: colors.accentLight },
    lastMove: { backgroundColor: "#cdd26a" },
    pieceText: { fontSize: 24 },
    rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    choiceBtn: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8 },
    choiceBtnActive: { backgroundColor: colors.tertiary, borderColor: colors.accent },
    choiceText: { color: colors.textSecondary, fontWeight: "700" },
    smallText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    cardTitle: { color: colors.text, fontWeight: "800", marginBottom: 8 },
    playBtn: { backgroundColor: colors.accent, borderRadius: 12, alignItems: "center", paddingVertical: 12, marginTop: 10 },
    playText: { color: colors.buttonText, fontWeight: "900" },
    playerLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", paddingVertical: 6 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    smallAction: { backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    smallActionText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    timerGrid: { flexDirection: "row", gap: 8 },
    timerBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tertiary, padding: 10 },
    timerText: { color: colors.text, fontSize: 26, fontWeight: "900", marginVertical: 4 },
    liveChatCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, padding: 10 },
    liveChatHint: { color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: 8 },
    quickPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    quickPill: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tertiary, paddingHorizontal: 10, paddingVertical: 7 },
    quickPillText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
    liveChatMessages: { marginBottom: 10, height: 170, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tertiary, overflow: "hidden" },
    liveChatMessagesContent: { padding: 8, gap: 8 },
    liveChatBubble: { maxWidth: "90%", borderRadius: 10, padding: 10 },
    liveUserBubble: { alignSelf: "flex-end", backgroundColor: colors.accent },
    liveAiBubble: { alignSelf: "flex-start", backgroundColor: colors.tertiary },
    liveChatBubbleText: { color: colors.text, fontSize: 12 },
    liveChatInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    voiceBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    voiceBtnActive: { borderColor: colors.accent, backgroundColor: colors.tertiary },
    voiceBtnText: { fontSize: 18 },
    liveChatInput: { flex: 1, minHeight: 40, backgroundColor: colors.inputBg, color: colors.text, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    liveChatSendBtn: { height: 40, borderRadius: 10, backgroundColor: colors.accent, justifyContent: "center", paddingHorizontal: 12 },
    liveChatSendText: { color: colors.buttonText, fontWeight: "800", fontSize: 12 },
    placeholderText: { color: colors.textMuted, marginTop: 8 },
    statusText: { color: colors.accent, fontWeight: "800" },
    diffBtn: { marginRight: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tertiary, paddingHorizontal: 10, paddingVertical: 8 },
    diffBtnActive: { borderColor: colors.accent, backgroundColor: colors.secondary },
    diffText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    diffRating: { color: colors.textMuted, fontSize: 10, fontWeight: "800", marginTop: 2, textAlign: "center" }
});
