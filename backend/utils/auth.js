import jwt from "jsonwebtoken";

export const createToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(payload, secret, { expiresIn: "7d" });
};

export const requireAuth = (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        const error = new Error("Unauthorized");
        error.status = 401;
        throw error;
    }

    const token = header.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET;

    try {
        req.user = jwt.verify(token, secret);
        next();
    } catch {
        const error = new Error("Invalid token");
        error.status = 401;
        throw error;
    }
};
