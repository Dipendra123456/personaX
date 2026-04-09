import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });


import { connectDb } from "./utils/db.js";
import { errorHandler, notFoundHandler } from "./utils/errorHandlers.js";
import { registerSocketServer } from "./sockets/index.js";
import authRoutes from "./routes/authRoutes.js";
import companionRoutes from "./routes/companionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import improveRoutes from "./routes/improveRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import avatarRoutes from "./routes/avatarRoutes.js";
import audioRoutes from "./routes/audioRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import { matchQueueWorker } from "./services/socialService.js";

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    if (origin === corsOrigin) {
        return true;
    }

    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(
    cors({
        origin: (origin, callback) => {
            callback(null, isAllowedOrigin(origin));
        },
        credentials: true
    })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "PersonaX API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/companions", companionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/improve", improveRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/social", socialRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const io = registerSocketServer(server, corsOrigin);

const port = Number(process.env.PORT) || 5000;

const start = async () => {
    await connectDb();
    server.listen(port, () => {
        console.log(`PersonaX API listening on port ${port}`);
    });

    // Start match queue worker - runs every 3 seconds
    setInterval(async () => {
        try {
            await matchQueueWorker(io);
        } catch (error) {
            console.error("Match queue worker error:", error);
        }
    }, 3000);

    console.log("Match queue worker started (runs every 3 seconds)");
};

start().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});
