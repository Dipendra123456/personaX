import { Router } from "express";
import { z } from "zod";
import { move, start } from "../controllers/gameController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

const startSchema = z.object({
    companionId: z.string().min(1),
    gameType: z.enum(["chess", "sudoku", "othello", "memory"]),
    difficulty: z.enum(["easy", "medium", "hard", "expert", "master"]).default("medium")
});

const moveSchema = z.object({
    sessionId: z.string().min(1),
    move: z.any()
});

router.use(asyncHandler(requireAuth));
router.post(
    "/start",
    (req, _res, next) => {
        startSchema.parse(req.body);
        next();
    },
    asyncHandler(start)
);

router.post(
    "/move",
    (req, _res, next) => {
        moveSchema.parse(req.body);
        next();
    },
    asyncHandler(move)
);

export default router;
