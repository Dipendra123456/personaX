import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { login, me, register, updateProfile } from "../controllers/authController.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    gender: z.string().min(2),
    age: z.number().int().min(13).max(120),
    nationality: z.string().min(2)
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    gender: z.string().min(2).optional(),
    age: z.number().int().min(13).max(120).optional(),
    nationality: z.string().min(2).optional(),
    socialLinks: z
        .object({
            linkedin: z.string().max(200).optional(),
            instagram: z.string().max(200).optional(),
            snapchat: z.string().max(200).optional()
        })
        .optional()
});

const validate = (schema) => (req, _res, next) => {
    schema.parse(req.body);
    next();
};

router.post("/register", validate(registerSchema), asyncHandler(register));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.get("/me", asyncHandler(requireAuth), asyncHandler(me));
router.put("/me", asyncHandler(requireAuth), validate(updateProfileSchema), asyncHandler(updateProfile));

export default router;
