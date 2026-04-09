import { applyMove, startGame } from "../services/gameService.js";

const sanitizeSession = (sessionDoc) => {
    const session = sessionDoc?.toObject ? sessionDoc.toObject() : sessionDoc;
    if (!session) {
        return session;
    }

    if (session.gameType !== "sudoku" || !session.state) {
        return session;
    }

    const { solution, ...safeState } = session.state;
    return {
        ...session,
        state: safeState
    };
};

export const start = async (req, res) => {
    const { companionId, gameType, difficulty } = req.body;
    const session = await startGame({ userId: req.user.id, companionId, gameType, difficulty });
    res.status(201).json(sanitizeSession(session));
};

export const move = async (req, res) => {
    const { sessionId, move } = req.body;
    const result = await applyMove({ userId: req.user.id, sessionId, move });
    res.json({
        ...result,
        session: sanitizeSession(result.session)
    });
};
