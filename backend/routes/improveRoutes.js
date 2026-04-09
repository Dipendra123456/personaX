import { Router } from "express";
import { z } from "zod";
import { improve } from "../controllers/improveController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

const bodySchema = z.object({
    companionId: z.string().min(1),
    problem: z.string().min(3).max(1000),
    mode: z.enum(["strict", "supportive", "mentor", "roast"]).optional()
});

router.use(asyncHandler(requireAuth));
router.post(
    "/",
    (req, _res, next) => {
        bodySchema.parse(req.body);
        next();
    },
    asyncHandler(improve)
);

export default router;
