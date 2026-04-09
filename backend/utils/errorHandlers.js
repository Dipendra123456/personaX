import { mapZodError } from "./validationErrorPatch.js";

export const notFoundHandler = (_req, res) => {
    res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (error, _req, res, _next) => {
    const patchedError = mapZodError(error);
    const status = patchedError.status || 500;
    const message = patchedError.message || "Internal server error";

    if (status >= 500) {
        console.error(patchedError);
    }

    res.status(status).json({ message });
};
