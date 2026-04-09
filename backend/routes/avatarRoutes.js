import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";
import { generateCompanionAvatar } from "../controllers/avatarController.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.post("/:id/generate", asyncHandler(generateCompanionAvatar));

export default router;
