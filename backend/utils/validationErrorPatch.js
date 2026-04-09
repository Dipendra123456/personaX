import { ZodError } from "zod";

export const mapZodError = (error) => {
    if (error instanceof ZodError) {
        const mapped = new Error(error.issues[0]?.message || "Validation failed");
        mapped.status = 400;
        return mapped;
    }

    return error;
};
