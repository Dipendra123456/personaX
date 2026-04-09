import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ChessGameMobile from "../components/ChessGameMobile";
import MemoryGameMobile from "../components/MemoryGameMobile";
import OthelloGameMobile from "../components/OthelloGameMobile";
import SudokuGameMobile from "../components/SudokuGameMobile";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const GAME_LIBRARY = [
    {
        id: "chess",
        name: "Chess",
        description: "Classic strategy with AI difficulty scaling."
    },
    {
        id: "sudoku",
        name: "Sudoku",
        description: "Puzzle battles with hint pressure."
    },
    {
        id: "othello",
        name: "Othello",
        description: "Flip pieces and pressure the board."
    },
    {
        id: "memory",
        name: "Memory Match",
        description: "Fast attention game with friendly taunts."
    }
];

const CHESS_PREVIEW = [
    ["♜", "", "", "", "♚", "", "", "♜"],
    ["", "♟", "♟", "", "", "♟", "♟", ""],
    ["", "", "", "♝", "", "", "", ""],
    ["", "", "", "", "♞", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "♘", "", "", "", "", ""],
    ["", "♙", "♙", "", "", "♙", "♙", ""],
    ["♖", "", "", "", "♔", "", "", "♖"]
];

const SUDOKU_PREVIEW = [
    [0, 0, 4, 0, 8, 0, 0, 1, 0],
    [0, 8, 0, 0, 0, 0, 0, 0, 7],
    [0, 0, 0, 2, 0, 0, 0, 0, 0],
    [0, 0, 9, 0, 0, 0, 4, 0, 0],
    [0, 0, 0, 0, 4, 0, 0, 0, 0],
    [0, 6, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 5, 0, 0],
    [7, 0, 0, 0, 0, 0, 0, 3, 0],
    [0, 3, 0, 0, 6, 0, 0, 0, 0]
];

const renderPreview = (gameId) => {
    if (gameId === "chess") {
        return (
            <View style={styles.previewChessBoard}>
                {CHESS_PREVIEW.map((rowData, row) => (
                    <View key={`c-row-${row}`} style={styles.previewRow}>
                        {rowData.map((piece, col) => {
                            const isLight = (row + col) % 2 === 0;
                            const square = [styles.previewSquare, isLight ? styles.chessLight : styles.chessDark];
                            return (
                                <View key={`c-cell-${row}-${col}`} style={square}>
                                    <Text style={styles.previewPiece}>{piece}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    }

    if (gameId === "sudoku") {
        return (
            <View style={styles.previewSudokuBoard}>
                {SUDOKU_PREVIEW.map((rowData, row) => (
                    <View key={`s-row-${row}`} style={styles.previewRow}>
                        {rowData.map((value, col) => {
                            const isAltBlock = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;
                            return (
                                <View
                                    key={`s-cell-${row}-${col}`}
                                    style={[
                                        styles.previewSquare,
                                        styles.sudokuCell,
                                        isAltBlock ? styles.sudokuLight : styles.sudokuDark,
                                        row % 3 === 0 && styles.sudokuTopHeavy,
                                        col % 3 === 0 && styles.sudokuLeftHeavy,
                                        row === 8 && styles.sudokuBottomHeavy,
                                        col === 8 && styles.sudokuRightHeavy
                                    ]}
                                >
                                    <Text style={styles.previewSudokuNumber}>{value || ""}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    }

    if (gameId === "othello") {
        return (
            <View style={styles.previewOthelloBoard}>
                {Array.from({ length: 4 }).map((_, row) => (
                    <View key={`o-row-${row}`} style={styles.previewRow}>
                        {Array.from({ length: 8 }).map((__, col) => {
                            const isCenter = (row === 1 || row === 2) && (col === 3 || col === 4);
                            const isBlack = row === 1 ? col === 3 : col === 4;
                            return (
                                <View key={`o-cell-${row}-${col}`} style={[styles.previewSquare, styles.othelloCell]}>
                                    {isCenter ? <View style={[styles.othelloDisc, isBlack ? styles.othelloBlack : styles.othelloWhite]} /> : null}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.previewMemoryBoard}>
            {Array.from({ length: 2 }).map((_, row) => (
                <View key={`m-row-${row}`} style={styles.previewMemoryRow}>
                    {Array.from({ length: 4 }).map((__, col) => (
                        <View key={`m-cell-${row}-${col}`} style={[styles.memoryCard, (row + col) % 2 === 0 ? styles.memoryCardFace : styles.memoryCardBack]}>
                            <Text style={styles.memoryCardText}>{(row + col) % 2 === 0 ? "★" : "?"}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};

export default function GameZoneScreen({ selectedCompanion, onGameMessage }) {
    const user = useAppStore((state) => state.user);
    const storeSelectedCompanion = useAppStore((state) => state.companions.find((item) => item._id === state.selectedCompanionId) || null);
    const activeCompanion = selectedCompanion || storeSelectedCompanion;
    const [selectedGame, setSelectedGame] = useState("chess");
    const [difficulty, setDifficulty] = useState(3);
    const [view, setView] = useState("library");

    const openGame = (gameId) => {
        setSelectedGame(gameId);
        setView("detail");
    };

    const goBack = () => setView("library");

    if (view === "detail" && selectedGame === "chess") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <Pressable onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Game Zone</Text>
                </Pressable>

                <ChessGameMobile
                    selectedCompanion={activeCompanion}
                    playerName={user?.name || "You"}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    onGameMessage={onGameMessage}
                />
            </ScrollView>
        );
    }

    if (view === "detail" && selectedGame === "sudoku") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <Pressable onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Game Zone</Text>
                </Pressable>

                <SudokuGameMobile
                    selectedCompanion={activeCompanion}
                    playerName={user?.name || "You"}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    onGameMessage={onGameMessage}
                />
            </ScrollView>
        );
    }

    if (view === "detail" && selectedGame === "othello") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <Pressable onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Game Zone</Text>
                </Pressable>

                <OthelloGameMobile
                    selectedCompanion={activeCompanion}
                    playerName={user?.name || "You"}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    onGameMessage={onGameMessage}
                />
            </ScrollView>
        );
    }

    if (view === "detail" && selectedGame === "memory") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <Pressable onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Game Zone</Text>
                </Pressable>

                <MemoryGameMobile
                    selectedCompanion={activeCompanion}
                    playerName={user?.name || "You"}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    onGameMessage={onGameMessage}
                />
            </ScrollView>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Game Zone</Text>
            </View>

            <View style={styles.grid}>
                {GAME_LIBRARY.map((game) => {
                    const active = selectedGame === game.id;
                    return (
                        <Pressable key={game.id} onPress={() => setSelectedGame(game.id)} style={[styles.gameCard, active && styles.gameCardActive]}>
                            <View style={styles.art}>
                                {renderPreview(game.id)}
                            </View>
                            <Text style={styles.gameLabel}>{game.id.toUpperCase()}</Text>
                            <Text style={styles.gameDesc}>{game.description}</Text>
                            <Pressable onPress={() => openGame(game.id)} style={styles.playBtn}>
                                <Text style={styles.playBtnText}>Play</Text>
                            </Pressable>
                        </Pressable>
                    );
                })}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 32 },
    headerCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    sectionLabel: { color: colors.accent, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "900" },
    backBtn: { alignSelf: "flex-start", marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 8 },
    backText: { color: colors.textSecondary, fontWeight: "800" },
    grid: { gap: 12 },
    gameCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 },
    gameCardActive: { borderColor: colors.accent },
    art: { borderRadius: 14, height: 160, backgroundColor: colors.inputBg, overflow: "hidden", padding: 10 },
    previewRow: { flexDirection: "row", flex: 1 },
    previewSquare: { flex: 1, alignItems: "center", justifyContent: "center" },
    previewChessBoard: { flex: 1, borderRadius: 10, overflow: "hidden" },
    chessLight: { backgroundColor: "#e8e8d0" },
    chessDark: { backgroundColor: "#769656" },
    previewPiece: { color: "#1f1f1f", fontSize: 14, fontWeight: "700" },
    previewSudokuBoard: { flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#8f8f99" },
    sudokuCell: { borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: "#a9a9a9" },
    sudokuLight: { backgroundColor: "#f1f1f1" },
    sudokuDark: { backgroundColor: "#e5e5e5" },
    sudokuTopHeavy: { borderTopWidth: 2, borderTopColor: "#80808a" },
    sudokuLeftHeavy: { borderLeftWidth: 2, borderLeftColor: "#80808a" },
    sudokuBottomHeavy: { borderBottomWidth: 2, borderBottomColor: "#80808a" },
    sudokuRightHeavy: { borderRightWidth: 2, borderRightColor: "#80808a" },
    previewSudokuNumber: { color: "#1f1f1f", fontWeight: "800", fontSize: 11 },
    previewOthelloBoard: { flex: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "#006400", padding: 4 },
    othelloCell: { backgroundColor: "#007200", margin: 1, borderRadius: 4 },
    othelloDisc: { width: 20, height: 20, borderRadius: 10 },
    othelloBlack: { backgroundColor: "#111" },
    othelloWhite: { backgroundColor: "#f8f8f8" },
    previewMemoryBoard: { flex: 1, justifyContent: "center", gap: 6 },
    previewMemoryRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
    memoryCard: { flex: 1, height: 56, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    memoryCardFace: { backgroundColor: "#f4d69f" },
    memoryCardBack: { backgroundColor: "#644196" },
    memoryCardText: { color: "#2d1d45", fontWeight: "900", fontSize: 16 },
    gameLabel: { color: colors.accent, marginTop: 10, fontSize: 12, letterSpacing: 2, fontWeight: "900" },
    gameDesc: { color: colors.textMuted, marginTop: 4 },
    playBtn: { marginTop: 10, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    playBtnText: { color: colors.buttonText, fontWeight: "900" }
});
