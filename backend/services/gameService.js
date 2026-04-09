import GameSession from "../models/GameSession.js";

const pickRandomMove = (state) => {
    const legalMoves = state.legalMoves || [];
    if (legalMoves.length === 0) {
        return null;
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
};

const pickStrategicMove = (state) => {
    return state.bestMove || pickRandomMove(state);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createEmptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(0));

const cloneBoard = (board) => board.map((row) => [...row]);

const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const isValidSudokuValue = (board, row, col, value) => {
    for (let idx = 0; idx < 9; idx += 1) {
        if (board[row][idx] === value || board[idx][col] === value) {
            return false;
        }
    }

    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    for (let r = boxStartRow; r < boxStartRow + 3; r += 1) {
        for (let c = boxStartCol; c < boxStartCol + 3; c += 1) {
            if (board[r][c] === value) {
                return false;
            }
        }
    }

    return true;
};

const generateSolvedSudoku = () => {
    const board = createEmptyBoard();

    const fillCell = (index) => {
        if (index >= 81) {
            return true;
        }

        const row = Math.floor(index / 9);
        const col = index % 9;
        const options = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const value of options) {
            if (!isValidSudokuValue(board, row, col, value)) {
                continue;
            }

            board[row][col] = value;
            if (fillCell(index + 1)) {
                return true;
            }
            board[row][col] = 0;
        }

        return false;
    };

    fillCell(0);
    return board;
};

const difficultyToClues = {
    easy: 44,
    medium: 38,
    hard: 32,
    expert: 28,
    master: 24
};

const buildSudokuPuzzle = (difficulty = "medium") => {
    const solved = generateSolvedSudoku();
    const puzzle = cloneBoard(solved);
    const cluesTarget = difficultyToClues[difficulty] || difficultyToClues.medium;
    const cellsToRemove = 81 - cluesTarget;
    const indices = shuffle(Array.from({ length: 81 }, (_, idx) => idx));

    for (let i = 0; i < cellsToRemove; i += 1) {
        const row = Math.floor(indices[i] / 9);
        const col = indices[i] % 9;
        puzzle[row][col] = 0;
    }

    const fixedMask = puzzle.map((row) => row.map((value) => value !== 0));

    return {
        puzzle,
        solution: solved,
        fixedMask
    };
};

const isSolvedBoard = (board, solution) => {
    for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 9; col += 1) {
            if (board[row][col] !== solution[row][col]) {
                return false;
            }
        }
    }
    return true;
};

const parseCell = (move) => {
    const row = Number(move?.row);
    const col = Number(move?.col);
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 8 || col < 0 || col > 8) {
        const error = new Error("Invalid cell coordinates");
        error.status = 400;
        throw error;
    }
    return { row, col };
};

const getSudokuFeedback = (action, status) => {
    if (status === "won") {
        return "Brilliant solve. You cracked the puzzle.";
    }
    if (status === "finished") {
        return "Round over. Want to try another puzzle?";
    }

    if (action === "hint") {
        return "Hint delivered. Keep your momentum.";
    }
    if (action === "undo") {
        return "Undid your last move.";
    }
    if (action === "erase") {
        return "Cell cleared. Re-evaluate this region.";
    }
    return "Good move. Keep building the solution.";
};

const createSudokuState = (difficulty) => {
    const { puzzle, solution, fixedMask } = buildSudokuPuzzle(difficulty);
    return {
        puzzle,
        board: cloneBoard(puzzle),
        fixedMask,
        solution,
        mistakes: 0,
        maxMistakes: 3,
        hintsUsed: 0,
        moveHistory: [],
        isPaused: false,
        status: "active"
    };
};

const handleSudokuMove = (session, move) => {
    const state = {
        ...session.state,
        board: cloneBoard(session.state.board || []),
        puzzle: cloneBoard(session.state.puzzle || []),
        fixedMask: (session.state.fixedMask || []).map((row) => [...row]),
        solution: cloneBoard(session.state.solution || []),
        moveHistory: [...(session.state.moveHistory || [])]
    };

    const action = move?.action || "set-value";
    const maxMistakes = Number.isInteger(state.maxMistakes) ? state.maxMistakes : 3;
    state.maxMistakes = maxMistakes;

    if (state.status === "won" || state.status === "finished") {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "This round is already over. Start a new game." }
        };
    }

    if (action === "pause") {
        state.isPaused = !state.isPaused;
        return {
            nextState: state,
            aiMove: { type: "coach", message: state.isPaused ? "Game paused." : "Game resumed." }
        };
    }

    if (state.isPaused && action !== "pause") {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "Resume the game before making moves." }
        };
    }

    if (action === "undo") {
        const lastEntry = state.moveHistory.pop();
        if (!lastEntry) {
            return {
                nextState: state,
                aiMove: { type: "coach", message: "No moves to undo." }
            };
        }

        state.board[lastEntry.row][lastEntry.col] = lastEntry.previousValue;
        state.status = "active";
        return {
            nextState: state,
            aiMove: { type: "coach", message: getSudokuFeedback("undo", state.status) }
        };
    }

    if (action === "hint") {
        let hintRow = null;
        let hintCol = null;

        if (move?.row !== undefined && move?.col !== undefined) {
            const parsed = parseCell(move);
            hintRow = parsed.row;
            hintCol = parsed.col;
        }

        if (
            hintRow === null
            || hintCol === null
            || state.fixedMask[hintRow]?.[hintCol]
            || state.board[hintRow]?.[hintCol] === state.solution[hintRow]?.[hintCol]
        ) {
            hintRow = -1;
            hintCol = -1;
            for (let r = 0; r < 9; r += 1) {
                for (let c = 0; c < 9; c += 1) {
                    if (!state.fixedMask[r][c] && state.board[r][c] !== state.solution[r][c]) {
                        hintRow = r;
                        hintCol = c;
                        break;
                    }
                }
                if (hintRow !== -1) {
                    break;
                }
            }
        }

        if (hintRow === -1 || hintCol === -1) {
            return {
                nextState: state,
                aiMove: { type: "coach", message: "No hint needed. Board looks complete." }
            };
        }

        const previousValue = state.board[hintRow][hintCol] || 0;
        const hintedValue = state.solution[hintRow][hintCol];
        state.board[hintRow][hintCol] = hintedValue;
        state.hintsUsed = clamp((state.hintsUsed || 0) + 1, 0, 99);
        state.moveHistory.push({
            row: hintRow,
            col: hintCol,
            previousValue,
            newValue: hintedValue,
            action: "hint"
        });

        if (isSolvedBoard(state.board, state.solution)) {
            state.status = "won";
            session.status = "finished";
        }

        return {
            nextState: state,
            aiMove: { type: "coach", message: getSudokuFeedback("hint", state.status), hint: { row: hintRow, col: hintCol } }
        };
    }

    const { row, col } = parseCell(move);
    if (state.fixedMask[row]?.[col]) {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "That is a fixed clue and cannot be changed." }
        };
    }

    if (action === "erase") {
        const previousValue = state.board[row][col] || 0;
        state.moveHistory.push({ row, col, previousValue, newValue: 0, action: "erase" });
        state.board[row][col] = 0;
        return {
            nextState: state,
            aiMove: { type: "coach", message: getSudokuFeedback("erase", state.status) }
        };
    }

    const value = Number(move?.value);
    if (!Number.isInteger(value) || value < 1 || value > 9) {
        const error = new Error("Move value must be between 1 and 9");
        error.status = 400;
        throw error;
    }

    const previousValue = state.board[row][col] || 0;
    state.board[row][col] = value;
    state.moveHistory.push({ row, col, previousValue, newValue: value, action: "set-value" });

    if (value !== state.solution[row][col]) {
        state.mistakes = clamp((state.mistakes || 0) + 1, 0, maxMistakes);
        if (state.mistakes >= maxMistakes) {
            state.status = "finished";
            session.status = "finished";
        }

        return {
            nextState: state,
            aiMove: {
                type: "coach",
                message: state.status === "finished"
                    ? getSudokuFeedback("set-value", "finished")
                    : "Not quite. Check row, column, and box constraints."
            }
        };
    }

    if (isSolvedBoard(state.board, state.solution)) {
        state.status = "won";
        session.status = "finished";
    }

    return {
        nextState: state,
        aiMove: { type: "coach", message: getSudokuFeedback("set-value", state.status) }
    };
};

const OTHELLO_SIZE = 8;
const OTHELLO_EMPTY = 0;
const OTHELLO_BLACK = 1;
const OTHELLO_WHITE = -1;
const OTHELLO_DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

const getOpponentColor = (color) => (color === "black" ? "white" : "black");

const colorToDisc = (color) => (color === "black" ? OTHELLO_BLACK : OTHELLO_WHITE);

const createOthelloBoard = () => {
    const board = Array.from({ length: OTHELLO_SIZE }, () => Array(OTHELLO_SIZE).fill(OTHELLO_EMPTY));
    board[3][3] = OTHELLO_WHITE;
    board[3][4] = OTHELLO_BLACK;
    board[4][3] = OTHELLO_BLACK;
    board[4][4] = OTHELLO_WHITE;
    return board;
};

const inOthelloBounds = (row, col) => row >= 0 && row < OTHELLO_SIZE && col >= 0 && col < OTHELLO_SIZE;

const cloneOthelloBoard = (board) => board.map((row) => [...row]);

const collectOthelloFlips = (board, row, col, color) => {
    if (!inOthelloBounds(row, col) || board[row][col] !== OTHELLO_EMPTY) {
        return [];
    }

    const placedDisc = colorToDisc(color);
    const opponentDisc = colorToDisc(getOpponentColor(color));
    const flips = [];

    for (const [deltaRow, deltaCol] of OTHELLO_DIRECTIONS) {
        const path = [];
        let currentRow = row + deltaRow;
        let currentCol = col + deltaCol;

        while (inOthelloBounds(currentRow, currentCol) && board[currentRow][currentCol] === opponentDisc) {
            path.push([currentRow, currentCol]);
            currentRow += deltaRow;
            currentCol += deltaCol;
        }

        if (path.length > 0 && inOthelloBounds(currentRow, currentCol) && board[currentRow][currentCol] === placedDisc) {
            flips.push(...path);
        }
    }

    return flips;
};

const getOthelloLegalMoves = (board, color) => {
    const legalMoves = [];

    for (let row = 0; row < OTHELLO_SIZE; row += 1) {
        for (let col = 0; col < OTHELLO_SIZE; col += 1) {
            const flips = collectOthelloFlips(board, row, col, color);
            if (flips.length > 0) {
                legalMoves.push({ row, col, flips });
            }
        }
    }

    return legalMoves;
};

const countOthelloDiscs = (board) => {
    const counts = { black: 0, white: 0 };

    for (const row of board) {
        for (const cell of row) {
            if (cell === OTHELLO_BLACK) {
                counts.black += 1;
            } else if (cell === OTHELLO_WHITE) {
                counts.white += 1;
            }
        }
    }

    return counts;
};

const isOthelloBoardFull = (board) => board.every((row) => row.every((cell) => cell !== OTHELLO_EMPTY));

const scoreOthelloMove = (board, move, color) => {
    const nextBoard = cloneOthelloBoard(board);
    const placedDisc = colorToDisc(color);
    nextBoard[move.row][move.col] = placedDisc;
    for (const [flipRow, flipCol] of move.flips) {
        nextBoard[flipRow][flipCol] = placedDisc;
    }

    const opponentColor = getOpponentColor(color);
    const opponentMoves = getOthelloLegalMoves(nextBoard, opponentColor).length;
    const myMoves = getOthelloLegalMoves(nextBoard, color).length;
    const isCorner = (move.row === 0 || move.row === OTHELLO_SIZE - 1) && (move.col === 0 || move.col === OTHELLO_SIZE - 1);
    const isEdge = move.row === 0 || move.row === OTHELLO_SIZE - 1 || move.col === 0 || move.col === OTHELLO_SIZE - 1;
    const cornerTrapPenalty = ([
        [0, 1], [1, 0], [1, 1],
        [0, 6], [1, 6], [1, 7],
        [6, 0], [6, 1], [7, 1],
        [6, 6], [6, 7], [7, 6]
    ]).some(([row, col]) => row === move.row && col === move.col) ? 20 : 0;

    return (move.flips.length * 12) + (isCorner ? 140 : 0) + (isEdge ? 20 : 0) + (myMoves * 4) - (opponentMoves * 6) - cornerTrapPenalty;
};

const chooseOthelloMove = (board, color, difficulty) => {
    const legalMoves = getOthelloLegalMoves(board, color);
    if (legalMoves.length === 0) {
        return null;
    }

    if (difficulty === "easy") {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
        const score = scoreOthelloMove(board, move, color);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
};

const buildOthelloState = (board, currentPlayer, difficulty, moveHistory = [], passesInRow = 0, lastMove = null) => {
    const scores = countOthelloDiscs(board);
    const legalMoves = getOthelloLegalMoves(board, currentPlayer).map(({ row, col, flips }) => ({
        row,
        col,
        captureCount: flips.length
    }));

    const blackMoves = getOthelloLegalMoves(board, "black").length;
    const whiteMoves = getOthelloLegalMoves(board, "white").length;
    const boardFull = isOthelloBoardFull(board);
    const finished = boardFull || (blackMoves === 0 && whiteMoves === 0);

    return {
        board,
        currentPlayer,
        difficulty,
        legalMoves,
        scores,
        moveHistory,
        passesInRow,
        lastMove,
        winner: finished
            ? scores.black === scores.white
                ? "draw"
                : scores.black > scores.white
                    ? "black"
                    : "white"
            : null,
        status: finished ? "finished" : "active"
    };
};

const resolveOthelloTurn = (state, difficulty) => {
    let workingState = {
        ...state,
        board: cloneOthelloBoard(state.board || createOthelloBoard()),
        moveHistory: [...(state.moveHistory || [])]
    };

    let safety = 0;

    while (safety < 16) {
        safety += 1;
        const legalMoves = getOthelloLegalMoves(workingState.board, workingState.currentPlayer || "black");

        if (legalMoves.length === 0) {
            const nextPasses = (workingState.passesInRow || 0) + 1;
            if (nextPasses >= 2) {
                return buildOthelloState(workingState.board, workingState.currentPlayer, difficulty, workingState.moveHistory, nextPasses, workingState.lastMove);
            }

            workingState = {
                ...workingState,
                currentPlayer: getOpponentColor(workingState.currentPlayer || "black"),
                passesInRow: nextPasses
            };
            continue;
        }

        workingState = {
            ...workingState,
            legalMoves: legalMoves.map(({ row, col, flips }) => ({ row, col, captureCount: flips.length })),
            scores: countOthelloDiscs(workingState.board)
        };

        if (workingState.currentPlayer === "white") {
            const aiMove = chooseOthelloMove(workingState.board, "white", difficulty);
            if (!aiMove) {
                workingState = {
                    ...workingState,
                    currentPlayer: "black"
                };
                continue;
            }

            const placedDisc = colorToDisc("white");
            workingState.board[aiMove.row][aiMove.col] = placedDisc;
            for (const [flipRow, flipCol] of aiMove.flips) {
                workingState.board[flipRow][flipCol] = placedDisc;
            }

            workingState = {
                ...workingState,
                currentPlayer: "black",
                passesInRow: 0,
                lastMove: { row: aiMove.row, col: aiMove.col, color: "white", captureCount: aiMove.flips.length },
                moveHistory: [...workingState.moveHistory, { row: aiMove.row, col: aiMove.col, color: "white", flips: aiMove.flips.length }]
            };
            continue;
        }

        break;
    }

    return buildOthelloState(
        workingState.board,
        workingState.currentPlayer || "black",
        difficulty,
        workingState.moveHistory,
        workingState.passesInRow || 0,
        workingState.lastMove || null
    );
};

const handleOthelloMove = (session, move) => {
    const state = {
        ...session.state,
        board: cloneOthelloBoard(session.state.board || createOthelloBoard()),
        moveHistory: [...(session.state.moveHistory || [])],
        currentPlayer: session.state.currentPlayer || "black",
        difficulty: session.difficulty || "medium",
        passesInRow: Number(session.state.passesInRow) || 0
    };

    if (state.status === "finished") {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "This Othello match is already over. Start a new game." }
        };
    }

    const action = move?.action || "place";
    const legalMoves = getOthelloLegalMoves(state.board, state.currentPlayer);

    if (action === "pass") {
        if (legalMoves.length > 0) {
            return {
                nextState: buildOthelloState(state.board, state.currentPlayer, state.difficulty, state.moveHistory, state.passesInRow, state.lastMove),
                aiMove: { type: "coach", message: "You still have a legal move. Place a disc instead of passing." }
            };
        }

        const passedState = {
            ...state,
            currentPlayer: getOpponentColor(state.currentPlayer),
            passesInRow: (state.passesInRow || 0) + 1
        };

        const resolvedState = resolveOthelloTurn(passedState, state.difficulty);
        return {
            nextState: resolvedState,
            aiMove: { type: "coach", message: "Turn passed. I will continue from the new board state." }
        };
    }

    const row = Number(move?.row);
    const col = Number(move?.col);
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= OTHELLO_SIZE || col < 0 || col >= OTHELLO_SIZE) {
        const error = new Error("Invalid Othello move coordinates");
        error.status = 400;
        throw error;
    }

    const chosenMove = legalMoves.find((item) => item.row === row && item.col === col);
    if (!chosenMove) {
        return {
            nextState: buildOthelloState(state.board, state.currentPlayer, state.difficulty, state.moveHistory, state.passesInRow, state.lastMove),
            aiMove: { type: "coach", message: "That move is not legal. Try one of the highlighted squares." }
        };
    }

    const placedDisc = colorToDisc(state.currentPlayer);
    state.board[row][col] = placedDisc;
    for (const [flipRow, flipCol] of chosenMove.flips) {
        state.board[flipRow][flipCol] = placedDisc;
    }

    state.moveHistory.push({ row, col, color: state.currentPlayer, flips: chosenMove.flips.length });
    state.lastMove = { row, col, color: state.currentPlayer, captureCount: chosenMove.flips.length };
    state.passesInRow = 0;
    state.currentPlayer = getOpponentColor(state.currentPlayer);

    const resolvedState = resolveOthelloTurn(state, state.difficulty);
    const counts = resolvedState.scores || countOthelloDiscs(resolvedState.board);
    const message = resolvedState.status === "finished"
        ? counts.black === counts.white
            ? "The board is full. The match ends in a draw."
            : counts.black > counts.white
                ? "Black wins the match."
                : "White wins the match."
        : `Placed at ${String.fromCharCode(65 + col)}${row + 1} and flipped ${chosenMove.flips.length} disc${chosenMove.flips.length === 1 ? "" : "s"}.`;

    return {
        nextState: resolvedState,
        aiMove: { type: "coach", message }
    };
};

const MEMORY_GRID_SIZE = 4;
const MEMORY_SYMBOLS = ["🌟", "❤️", "🎮", "🎨", "🎭", "🎪", "🎯", "🎲"];
const MEMORY_RECALL_RATE = {
    easy: 0.1,
    medium: 0.55,
    hard: 0.85,
    expert: 0.95,
    master: 1
};

const shouldRecall = (difficulty) => {
    const chance = MEMORY_RECALL_RATE[difficulty] ?? MEMORY_RECALL_RATE.medium;
    return Math.random() < chance;
};

const createMemoryState = (difficulty) => {
    const pairCount = (MEMORY_GRID_SIZE * MEMORY_GRID_SIZE) / 2;
    const deckSymbols = shuffle([...MEMORY_SYMBOLS.slice(0, pairCount), ...MEMORY_SYMBOLS.slice(0, pairCount)]);
    const cards = deckSymbols.map((symbol, index) => ({
        id: index,
        symbol,
        revealed: false,
        matched: false
    }));

    return {
        gridSize: MEMORY_GRID_SIZE,
        cards,
        currentTurn: "player",
        pairs: { player: 0, companion: 0 },
        moves: 0,
        revealedSelection: [],
        seenByAI: {},
        status: "active",
        winner: null,
        lastAction: null,
        isResolvingMismatch: false,
        difficulty
    };
};

const cloneMemoryCards = (cards = []) => cards.map((card) => ({ ...card }));

const cloneSeenByAI = (seenByAI = {}) => Object.fromEntries(
    Object.entries(seenByAI).map(([symbol, ids]) => [symbol, [...ids]])
);

const getMemoryAvailableCardIds = (cards) => cards
    .filter((card) => !card.matched && !card.revealed)
    .map((card) => card.id);

const rememberCardForAI = (state, cardId) => {
    const card = state.cards[cardId];
    if (!card || card.matched) {
        return;
    }

    const existing = state.seenByAI[card.symbol] || [];
    if (!existing.includes(cardId)) {
        state.seenByAI[card.symbol] = [...existing, cardId];
    }
};

const cleanMemoryAI = (state) => {
    const activeBySymbol = {};

    for (const card of state.cards) {
        if (!card.matched) {
            if (!activeBySymbol[card.symbol]) {
                activeBySymbol[card.symbol] = [];
            }
            activeBySymbol[card.symbol].push(card.id);
        }
    }

    const nextSeen = {};
    for (const [symbol, ids] of Object.entries(state.seenByAI)) {
        const validIds = ids.filter((id) => activeBySymbol[symbol]?.includes(id));
        if (validIds.length > 0) {
            nextSeen[symbol] = Array.from(new Set(validIds));
        }
    }

    state.seenByAI = nextSeen;
};

const isMemoryFinished = (state) => state.cards.every((card) => card.matched);

const resolveMemoryWinner = () => "player";

const hideMemoryPair = (state, firstId, secondId) => {
    state.cards[firstId].revealed = false;
    state.cards[secondId].revealed = false;
};

const applyMemoryPair = (state, firstId, secondId, owner) => {
    const first = state.cards[firstId];
    const second = state.cards[secondId];

    rememberCardForAI(state, firstId);
    rememberCardForAI(state, secondId);

    state.moves = (state.moves || 0) + 1;
    state.revealedSelection = [];

    if (first.symbol === second.symbol) {
        first.matched = true;
        second.matched = true;
        state.pairs[owner] = (state.pairs[owner] || 0) + 1;
        cleanMemoryAI(state);
        state.lastAction = { type: "match", owner, symbol: first.symbol, cards: [firstId, secondId] };
        return true;
    }

    hideMemoryPair(state, firstId, secondId);
    state.lastAction = { type: "mismatch", owner, cards: [firstId, secondId] };
    return false;
};

const runMemoryCompanionTurn = () => { };

const handleMemoryMove = (session, move) => {
    const state = {
        ...session.state,
        cards: cloneMemoryCards(session.state.cards || []),
        pairs: { ...(session.state.pairs || { player: 0, companion: 0 }) },
        revealedSelection: [...(session.state.revealedSelection || [])],
        seenByAI: cloneSeenByAI(session.state.seenByAI || {}),
        moves: Number(session.state.moves) || 0,
        currentTurn: session.state.currentTurn || "player",
        status: session.state.status || "active",
        winner: session.state.winner || null,
        difficulty: session.state.difficulty || session.difficulty || "medium",
        isResolvingMismatch: false
    };

    if (state.status === "finished") {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "This Memory Match round is complete. Start a new game." }
        };
    }

    state.currentTurn = "player";

    const action = move?.action || "flip";
    if (action !== "flip") {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "Use flip actions to play Memory Match." }
        };
    }

    const cardId = Number(move?.cardId);
    if (!Number.isInteger(cardId) || cardId < 0 || cardId >= state.cards.length) {
        const error = new Error("Invalid memory card index");
        error.status = 400;
        throw error;
    }

    const card = state.cards[cardId];
    if (!card || card.matched || card.revealed || state.revealedSelection.includes(cardId)) {
        return {
            nextState: state,
            aiMove: { type: "coach", message: "Pick a hidden card that is not already matched." }
        };
    }

    card.revealed = true;
    state.revealedSelection.push(cardId);
    rememberCardForAI(state, cardId);

    if (state.revealedSelection.length < 2) {
        return {
            nextState: state,
            aiMove: { type: "coach" }
        };
    }

    const [firstId, secondId] = state.revealedSelection;
    const matched = applyMemoryPair(state, firstId, secondId, "player");

    if (isMemoryFinished(state)) {
        state.status = "finished";
        state.winner = resolveMemoryWinner(state);
        session.status = "finished";
        return {
            nextState: state,
            aiMove: {
                type: "coach",
                message: "All pairs matched. Great focus, you completed the board."
            }
        };
    }

    if (matched) {
        return {
            nextState: state,
            aiMove: { type: "coach", message: `Nice match. You found ${state.cards[firstId].symbol}. Go again.` }
        };
    }

    state.currentTurn = "player";

    return {
        nextState: state,
        aiMove: { type: "coach", message: "Not a match yet. Try another pair." }
    };
};

export const startGame = async ({ userId, companionId, gameType, difficulty }) => {
    const initialState = gameType === "sudoku"
        ? createSudokuState(difficulty)
        : gameType === "othello"
            ? buildOthelloState(createOthelloBoard(), "black", difficulty)
            : gameType === "memory"
                ? createMemoryState(difficulty)
                : { board: null, legalMoves: [] };

    const session = await GameSession.create({
        userId,
        companionId,
        gameType,
        difficulty,
        state: initialState
    });

    return session;
};

export const applyMove = async ({ userId, sessionId, move }) => {
    const session = await GameSession.findOne({ _id: sessionId, userId });
    if (!session) {
        const error = new Error("Game session not found");
        error.status = 404;
        throw error;
    }

    if (session.gameType === "sudoku") {
        const { nextState, aiMove } = handleSudokuMove(session, move || {});
        session.state = nextState;
        await session.save();

        return { session, aiMove };
    }

    if (session.gameType === "othello") {
        const { nextState, aiMove } = handleOthelloMove(session, move || {});
        session.state = nextState;
        session.status = nextState.status === "finished" ? "finished" : session.status;
        await session.save();

        return { session, aiMove };
    }

    if (session.gameType === "memory") {
        const { nextState, aiMove } = handleMemoryMove(session, move || {});
        session.state = nextState;
        session.status = nextState.status === "finished" ? "finished" : session.status;
        await session.save();

        return { session, aiMove };
    }

    const nextState = {
        ...session.state,
        lastUserMove: move,
        legalMoves: session.state.legalMoves || []
    };

    const aiMove = session.difficulty === "hard" ? pickStrategicMove(nextState) : pickRandomMove(nextState);

    session.state = {
        ...nextState,
        aiMove
    };
    await session.save();

    return { session, aiMove };
};
