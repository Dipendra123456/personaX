import mongoose from "mongoose";

export const connectDb = async () => {
    const uri = process.env.MONGODB_URI;
    const fallbackUri = process.env.MONGODB_FALLBACK_URI || "mongodb://127.0.0.1:27017/personax";
    const allowFallback = process.env.MONGODB_ALLOW_FALLBACK !== "false";

    if (!uri) {
        throw new Error("MONGODB_URI is not configured");
    }

    try {
        await mongoose.connect(uri, {
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 6000
        });
        console.log("MongoDB connected (primary)");
        return;
    } catch (error) {
        if (!allowFallback) {
            throw error;
        }

        console.warn("Primary MongoDB unavailable. Trying fallback URI...");
        await mongoose.connect(fallbackUri, {
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 4000
        });
        console.log("MongoDB connected (fallback)");
    }
};
