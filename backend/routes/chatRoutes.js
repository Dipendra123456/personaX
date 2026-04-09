import { Router } from "express";
import { z } from "zod";
import { chatWithCompanion, getChatHistory } from "../controllers/chatController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

const bodySchema = z.object({
    companionId: z.string().min(1),
    message: z.string().min(1).max(2000)
});

router.use(asyncHandler(requireAuth));
router.post(
    "/",
    (req, _res, next) => {
        bodySchema.parse(req.body);
        next();
    },
    asyncHandler(chatWithCompanion)
);
router.get("/:companionId/history", asyncHandler(getChatHistory));

export default router;
