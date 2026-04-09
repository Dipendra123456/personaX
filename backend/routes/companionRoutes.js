import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../utils/auth.js";
import {
    createCompanion,
    deleteCompanion,
    listCompanions,
    updateCompanion
} from "../controllers/companionController.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.get("/", asyncHandler(listCompanions));
router.post("/", asyncHandler(createCompanion));
router.put("/:id", asyncHandler(updateCompanion));
router.delete("/:id", asyncHandler(deleteCompanion));

export default router;
