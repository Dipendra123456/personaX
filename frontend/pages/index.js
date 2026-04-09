import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import CreateCompanionForm from "../components/CreateCompanionForm";
import ChatPanel from "../components/ChatPanel";
import ChessGame from "../components/ChessGame";
import MemoryGame from "../components/MemoryGame";
import OthelloGame from "../components/OthelloGame";
import SelfImprovementPanel from "../components/SelfImprovementPanel";
import SudokuGame from "../components/SudokuGame";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

const NAV_ITEMS = [
    { id: "home", label: "Home", sublabel: "Companions & chat", accent: "green", icon: "⌂" },
    { id: "game-zone", label: "Game Zone", sublabel: "Play with your companion", accent: "red", icon: "◫" },
    { id: "socialize", label: "Socialize", sublabel: "Anonymous or social play", accent: "blue", icon: "◎" },
    { id: "self-improvement", label: "Self Improvement", sublabel: "Plans, schedules, reminders", accent: "orange", icon: "◔" },
    { id: "settings", label: "Settings", sublabel: "App & privacy", accent: "green", icon: "⚙" }
];

const buildGameArt = (title, accentA, accentB, graphic) => `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${accentA}" />
            <stop offset="100%" stop-color="${accentB}" />
        </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#bg)" />
    ${graphic}
    <rect x="54" y="54" width="250" height="66" rx="22" fill="#080c18" fill-opacity="0.72" />
    <text x="82" y="98" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700">${title}</text>
</svg>
`)}`;

const CHESS_ART = buildGameArt(
    "Chess",
    "#1f2937",
    "#0f172a",
    `
    <g transform="translate(240 140)">
        <rect x="0" y="0" width="720" height="520" rx="36" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.2" />
        ${Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => {
        const fill = (row + col) % 2 === 0 ? "#f8fafc" : "#1e293b";
        return `<rect x="${64 + col * 78}" y="${44 + row * 78}" width="78" height="78" fill="${fill}" />`;
    }).join("")).join("")}
        <text x="130" y="322" fill="#111827" font-family="Georgia, serif" font-size="122" font-weight="700">♔</text>
        <text x="522" y="378" fill="#f8fafc" font-family="Georgia, serif" font-size="118" font-weight="700">♚</text>
    </g>
`
);

const SUDOKU_ART = buildGameArt(
    "Sudoku",
    "#0f766e",
    "#134e4a",
    `
    <g transform="translate(245 120)">
        <rect x="0" y="0" width="710" height="560" rx="36" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.18" />
        <rect x="72" y="52" width="566" height="456" rx="18" fill="#f8fafc" />
        ${Array.from({ length: 10 }, (_, index) => {
        const pos = 72 + index * 56.6;
        const thick = index % 3 === 0 ? 5 : 2;
        return [
            `<line x1="${pos}" y1="52" x2="${pos}" y2="508" stroke="#0f172a" stroke-width="${thick}" />`,
            `<line x1="72" y1="${pos}" x2="638" y2="${pos}" stroke="#0f172a" stroke-width="${thick}" />`
        ].join("");
    }).join("")}
        <g fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" text-anchor="middle" dominant-baseline="middle">
            <text x="100" y="94">8</text><text x="156" y="150">1</text><text x="212" y="94">9</text><text x="268" y="206">6</text><text x="324" y="150">2</text><text x="380" y="94">7</text>
            <text x="436" y="262">4</text><text x="492" y="206">3</text><text x="548" y="150">5</text><text x="604" y="94">6</text>
        </g>
    </g>
`
);

const OTHELLO_ART = buildGameArt(
    "Othello",
    "#0f766e",
    "#0f172a",
    `
    <g transform="translate(230 120)">
        <rect x="0" y="0" width="740" height="560" rx="36" fill="#14532d" stroke="#ffffff" stroke-opacity="0.14" />
        ${Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => {
        const x = 76 + col * 74;
        const y = 52 + row * 74;
        return `<rect x="${x}" y="${y}" width="74" height="74" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.12" />`;
    }).join("")).join("")}
        <circle cx="280" cy="232" r="42" fill="#0f172a" />
        <circle cx="354" cy="232" r="42" fill="#f8fafc" />
        <circle cx="428" cy="306" r="42" fill="#f8fafc" />
        <circle cx="502" cy="306" r="42" fill="#0f172a" />
    </g>
`
);

const MEMORY_ART = buildGameArt(
    "Memory Match",
    "#be123c",
    "#7f1d1d",
    `
    <g transform="translate(250 120)">
        <rect x="0" y="0" width="700" height="560" rx="36" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.16" />
        <g transform="translate(88 70) rotate(-8 170 170)">
            <rect x="0" y="0" width="160" height="220" rx="22" fill="#f8fafc" />
            <circle cx="80" cy="92" r="44" fill="#f43f5e" />
            <text x="80" y="102" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" text-anchor="middle">★</text>
        </g>
        <g transform="translate(278 142) rotate(10 170 170)">
            <rect x="0" y="0" width="160" height="220" rx="22" fill="#1f2937" />
            <circle cx="80" cy="92" r="44" fill="#fb7185" />
            <text x="80" y="102" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" text-anchor="middle">♥</text>
        </g>
        <g transform="translate(486 66) rotate(-4 170 170)">
            <rect x="0" y="0" width="160" height="220" rx="22" fill="#f8fafc" />
            <circle cx="80" cy="92" r="44" fill="#0ea5e9" />
            <text x="80" y="104" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" text-anchor="middle">?</text>
        </g>
    </g>
`
);

const GAME_LIBRARY = [
    {
        id: "chess",
        name: "Chess",
        description: "Classic strategy with AI difficulty scaling.",
        image: CHESS_ART
    },
    {
        id: "sudoku",
        name: "Sudoku",
        description: "Puzzle battles with hint pressure.",
        image: SUDOKU_ART
    },
    {
        id: "othello",
        name: "Othello",
        description: "Flip pieces and pressure the board.",
        image: OTHELLO_ART
    },
    {
        id: "memory",
        name: "Memory Match",
        description: "Fast attention game with friendly taunts.",
        image: MEMORY_ART
    }
];

const SOCIAL_MODES = ["Solo + AI", "Anonymous room", "Friends room", "Team mode"];

const SETTINGS_ITEMS = [
    { label: "Anonymous social presence", description: "Hide profile identity in public rooms." },
    { label: "Companion memory", description: "Keep long-term memory between chats." },
    { label: "Voice chat", description: "Enable microphone chat when supported." },
    { label: "Safety filter", description: "Block abusive or unsafe prompts." }
];

const ACCENT_CLASS_MAP = {
    red: {
        bg: "personax-bg-red",
        border: "personax-border-red",
        glow: "personax-glow-red"
    },
    green: {
        bg: "personax-bg-green",
        border: "personax-border-green",
        glow: "personax-glow-green"
    },
    blue: {
        bg: "personax-bg-blue",
        border: "personax-border-blue",
        glow: "personax-glow-blue"
    },
    orange: {
        bg: "personax-bg-orange",
        border: "personax-border-orange",
        glow: "personax-glow-orange"
    }
};

const DEFAULT_TAB = "home";
const TAB_IDS = new Set(NAV_ITEMS.map((item) => item.id));

const QUICK_FALLBACK_COMPANIONS = [
    {
        _id: "quick-dipendra",
        name: "Dipendra",
        isAutoCompanion: true,
        gender: "male",
        avatarSettings: { style: "anime" }
    },
    {
        _id: "quick-mia-khalifa",
        name: "Mia Khalifa",
        isAutoCompanion: true,
        gender: "female",
        avatarSettings: { style: "anime" }
    }
];

const formatUiError = (message) => {
    const text = String(message || "Something went wrong.");
    const lower = text.toLowerCase();

    if (lower.includes("gemini quota exceeded") || lower.includes("quota exceeded") || lower.includes("too many requests")) {
        return "Gemini quota is exhausted right now. Please add quota/billing or switch provider.";
    }

    if (lower.includes("gemini is temporarily unavailable")) {
        return "Gemini is temporarily unavailable. Please try again.";
    }

    if (lower.includes("fallback provider is unavailable")) {
        return "Gemini quota is exhausted and fallback provider is unavailable right now.";
    }

    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
};

export default function HomePage() {
    const router = useRouter();
    const {
        companions,
        selectedCompanionId,
        token,
        user,
        setAuth,
        clearAuth,
        setCompanions,
        selectCompanion,
        hydrateAuth,
        hasHydrated
    } = useCompanionStore();

    const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [selectedGame, setSelectedGame] = useState("chess");
    const [gameZoneView, setGameZoneView] = useState("library");
    const [gameDifficulty, setGameDifficulty] = useState(3);
    const [socialPresence, setSocialPresence] = useState("anonymous");
    const [socialMode, setSocialMode] = useState("Anonymous room");
    const [roomCode, setRoomCode] = useState("PX-4821");
    const [settings, setSettings] = useState({
        anonymousProfile: true,
        companionMemory: true,
        voiceChat: false,
        safetyFilter: true
    });

    const quickCompanions = useMemo(
        () => companions.filter((companion) => companion.isAutoCompanion),
        [companions]
    );

    const customCompanions = useMemo(
        () => companions.filter((companion) => !companion.isAutoCompanion),
        [companions]
    );

    const effectiveQuickCompanions = quickCompanions.length > 0 ? quickCompanions : QUICK_FALLBACK_COMPANIONS;

    const selectedCompanion = useMemo(
        () => companions.find((companion) => companion._id === selectedCompanionId)
            || effectiveQuickCompanions.find((companion) => companion._id === selectedCompanionId),
        [companions, effectiveQuickCompanions, selectedCompanionId]
    );

    const isUnauthorizedError = (err) => {
        const text = String(err?.message || "").toLowerCase();
        return text.includes("unauthorized") || text.includes("invalid token");
    };

    const forceLogout = () => {
        setIsLoggingOut(true);
        clearAuth();
        router.replace("/login");
    };

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const applyHash = () => {
            const pathTab = window.location.pathname.replace(/^\//, "");
            const hashTab = window.location.hash.replace(/^#/, "");
            const nextTab = TAB_IDS.has(pathTab) ? pathTab : (hashTab || DEFAULT_TAB);
            setActiveTab(TAB_IDS.has(nextTab) ? nextTab : DEFAULT_TAB);
        };

        applyHash();
        window.addEventListener("hashchange", applyHash);

        return () => window.removeEventListener("hashchange", applyHash);
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            if (!hasHydrated) {
                hydrateAuth();
                return;
            }

            try {
                if (!token) {
                    router.replace("/login");
                    return;
                }

                const session = await api.me(token);
                setAuth({ token, user: session.user });
                const list = await api.listCompanions(token);
                setCompanions(list);
            } catch (err) {
                if (isUnauthorizedError(err)) {
                    forceLogout();
                    return;
                }

                setError(err.message || "Failed to fetch companions");
            }
        };

        bootstrap();
    }, [token, router, setCompanions, hydrateAuth, hasHydrated, setAuth]);

    useEffect(() => {
        setMessages([]);
    }, [selectedCompanionId]);

    useEffect(() => {
        if (activeTab !== "game-zone") {
            setGameZoneView("library");
        }
    }, [activeTab]);

    const createCompanion = async (payload) => {
        try {
            const created = await api.createCompanion(payload, token);
            let nextCompanion = created;

            if (!created.isAutoCompanion) {
                try {
                    const avatarResult = await api.generateAvatar(created._id, token);
                    nextCompanion = avatarResult.companion;
                } catch (avatarError) {
                    setError(`Companion created, but avatar generation failed: ${avatarError.message}`);
                }
            }

            setCompanions([nextCompanion, ...companions.filter((companion) => companion._id !== nextCompanion._id)]);
            selectCompanion(created._id);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(err.message || "Could not create companion");
        }
    };

    const updateCompanion = async (companionId, payload) => {
        try {
            const updated = await api.updateCompanion(companionId, payload, token);
            setCompanions(
                companions.map((companion) => (companion._id === companionId ? updated : companion))
            );
            selectCompanion(updated._id);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(err.message || "Could not update companion");
        }
    };

    const deleteCompanion = async (companionId) => {
        try {
            await api.deleteCompanion(companionId, token);
            const remainingCompanions = companions.filter((companion) => companion._id !== companionId);
            setCompanions(remainingCompanions);

            if (selectedCompanionId === companionId) {
                const nextSelection = remainingCompanions[0]?._id || effectiveQuickCompanions[0]?._id || null;
                selectCompanion(nextSelection);
            }
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(err.message || "Could not delete companion");
        }
    };

    const makeCompanionQuick = async (companion) => {
        try {
            const updated = await api.updateCompanion(
                companion._id,
                { isAutoCompanion: true },
                token
            );

            setCompanions(
                companions.map((item) => (item._id === companion._id ? updated : item))
            );
            selectCompanion(updated._id);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(err.message || "Could not move companion to quick section");
        }
    };

    const sendMessage = async (input, companionId, options = {}) => {
        const activeCompanionId = companionId || selectedCompanionId;

        if (!activeCompanionId) {
            return;
        }

        if (options.fromVoice) {
            const appended = [];
            if (input) {
                appended.push({ role: "user", content: input });
            }
            if (options.aiReply) {
                appended.push({ role: "ai", content: options.aiReply });
            }
            if (appended.length) {
                setMessages((prev) => [...prev, ...appended]);
            }
            return;
        }

        setError("");
        setMessages((prev) => [...prev, { role: "user", content: input }]);

        try {
            const result = await api.chat(
                {
                    companionId: companions.find((companion) => companion._id === activeCompanionId)?._id || activeCompanionId,
                    message: input
                },
                token
            );

            setMessages((prev) => [...prev, { role: "ai", content: result.reply }]);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(formatUiError(err.message));
        }
    };

    const startGame = async () => {
        if (!selectedCompanionId) {
            setError("Pick a companion before starting a game.");
            return;
        }

        try {
            await api.startGame({
                companionId: selectedCompanionId,
                gameType: selectedGame,
                difficulty: gameDifficulty <= 2 ? "easy" : gameDifficulty <= 4 ? "medium" : "hard"
            }, token);
            setError("");
        } catch (err) {
            if (isUnauthorizedError(err)) {
                forceLogout();
                return;
            }
            setError(err.message || "Could not start game");
        }
    };

    const handleGameMessage = (content) => {
        setMessages((prev) => [...prev, { role: "ai", content: `[Game] ${content}` }]);
    };

    const openGameSubpage = (gameId) => {
        setSelectedGame(gameId);
        setGameZoneView("detail");
        setError("");
    };

    const backToGameLibrary = () => {
        setGameZoneView("library");
        setError("");
    };

    const sidebarButtonClass = (tabId, accent) => {
        const theme = ACCENT_CLASS_MAP[accent] || ACCENT_CLASS_MAP.green;

        return `w-full rounded-2xl border px-4 py-3 text-left transition ${activeTab === tabId
            ? `${theme.border} ${theme.bg} ${theme.glow} text-white`
            : "border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800"
            }`;
    };

    const sectionTone = (tabId) => ACCENT_CLASS_MAP[NAV_ITEMS.find((item) => item.id === tabId)?.accent || "green"];

    const themedShell = (tabId, children) => {
        const tone = sectionTone(tabId);
        return (
            <div className={`rounded-[28px] border border-slate-800 ${tone.bg} p-5`}>
                <div className={`mb-4 h-1.5 w-24 rounded-full ${tone.glow} ${tone.border}`}></div>
                {children}
            </div>
        );
    };

    const renderHome = () => (
        <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
            <div className="space-y-4">
                <CreateCompanionForm
                    onCreate={createCompanion}
                    onUpdate={updateCompanion}
                    onDelete={deleteCompanion}
                    onMakeQuick={makeCompanionQuick}
                    quickCompanions={effectiveQuickCompanions}
                    customCompanions={customCompanions}
                    selectedId={selectedCompanionId}
                    onSelect={selectCompanion}
                />
            </div>

            <div className="space-y-4">
                <ChatPanel selectedCompanion={selectedCompanion} messages={messages} onSend={sendMessage} />
            </div>
        </div>
    );

    const renderGameZone = () => {
        const selectedGameMeta = GAME_LIBRARY.find((game) => game.id === selectedGame) || GAME_LIBRARY[0];

        if (gameZoneView === "library") {
            return (
                <div className="space-y-4">
                    <section className="personax-card p-5">
                        <p className="text-xs uppercase tracking-[0.35em] text-brand-500">Game Zone</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">Choose a game and enter its subpage.</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Click Play to open the game page, then choose difficulty and start from there.
                        </p>
                    </section>

                    <div className="grid gap-5 md:grid-cols-2">
                        {GAME_LIBRARY.map((game) => {
                            const active = selectedGame === game.id;
                            return (
                                <article
                                    key={game.id}
                                    onClick={() => setSelectedGame(game.id)}
                                    className={`group relative overflow-hidden rounded-2xl border transition min-h-[260px] ${active
                                        ? "border-brand-500 ring-2 ring-brand-500"
                                        : "border-slate-700 hover:border-slate-500"
                                        }`}
                                >
                                    <img
                                        src={game.image}
                                        alt={`${game.name} preview`}
                                        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
                                    <div className="relative flex h-full flex-col justify-end p-5">
                                        <p className="text-xs uppercase tracking-[0.3em] text-brand-400">{game.id}</p>
                                        <p className="mt-2 text-sm text-slate-200">{game.description}</p>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openGameSubpage(game.id);
                                                }}
                                                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-black hover:bg-brand-600"
                                            >
                                                Play
                                            </button>
                                        </div>
                                    </div>
                                    {active ? (
                                        <div className="absolute right-3 top-3 rounded-full border border-brand-500 bg-brand-500 px-2 py-1 text-[11px] font-bold text-black">
                                            Selected
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <section className="personax-card p-5">
                    <button
                        type="button"
                        onClick={backToGameLibrary}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                    >
                        ← Back to Game Zone
                    </button>
                    {selectedGame !== "chess" && selectedGame !== "sudoku" && selectedGame !== "othello" && selectedGame !== "memory" ? (
                        <>
                            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-brand-500">{selectedGameMeta.id}</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">{selectedGameMeta.name} Setup</h2>
                            <p className="mt-2 text-sm text-slate-400">{selectedGameMeta.description}</p>
                        </>
                    ) : null}
                </section>

                {selectedGame !== "chess" && selectedGame !== "sudoku" && selectedGame !== "othello" && selectedGame !== "memory" ? (
                    <section className="personax-card p-4">
                        <h3 className="text-lg font-semibold text-white">Game Options</h3>
                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
                            <div>
                                <label className="mb-2 block text-sm text-slate-300">Difficulty</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="7"
                                    value={gameDifficulty}
                                    onChange={(event) => setGameDifficulty(Number(event.target.value))}
                                    className="w-full"
                                />
                                <div className="mt-2 flex justify-between text-xs text-slate-500">
                                    <span>Easy</span>
                                    <span>Medium</span>
                                    <span>Hard</span>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-700">
                                <img src={selectedGameMeta.image} alt={`${selectedGameMeta.name} art`} className="h-full min-h-[120px] w-full object-cover" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={startGame}
                            className="mt-4 rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-black hover:bg-brand-600"
                        >
                            Play {selectedGameMeta.name}
                        </button>
                    </section>
                ) : null}

                {selectedGame === "chess" ? (
                    <ChessGame
                        key={`${selectedCompanionId || "none"}-${gameDifficulty}`}
                        selectedCompanion={selectedCompanion}
                        playerName={user?.name || "You"}
                        difficulty={gameDifficulty}
                        onDifficultyChange={setGameDifficulty}
                        onGameMessage={handleGameMessage}
                    />
                ) : selectedGame === "sudoku" ? (
                    <SudokuGame
                        key={`sudoku-${selectedCompanionId || "none"}-${gameDifficulty}`}
                        selectedCompanion={selectedCompanion}
                        playerName={user?.name || "You"}
                        difficulty={gameDifficulty}
                        onDifficultyChange={setGameDifficulty}
                        onGameMessage={handleGameMessage}
                    />
                ) : selectedGame === "othello" ? (
                    <OthelloGame
                        key={`othello-${selectedCompanionId || "none"}-${gameDifficulty}`}
                        selectedCompanion={selectedCompanion}
                        playerName={user?.name || "You"}
                        difficulty={gameDifficulty}
                        onDifficultyChange={setGameDifficulty}
                        onGameMessage={handleGameMessage}
                    />
                ) : selectedGame === "memory" ? (
                    <MemoryGame
                        key={`memory-${selectedCompanionId || "none"}-${gameDifficulty}`}
                        selectedCompanion={selectedCompanion}
                        playerName={user?.name || "You"}
                        difficulty={gameDifficulty}
                        onDifficultyChange={setGameDifficulty}
                        onGameMessage={handleGameMessage}
                    />
                ) : (
                    <section className="personax-card p-4">
                        <h3 className="text-lg font-semibold text-white">{selectedGameMeta.name} is coming next</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            This subpage is now ready. Core gameplay for this game will be added next.
                        </p>
                    </section>
                )}
            </div>
        );
    };

    const renderSocialize = () => (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
                <section className="personax-card p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-brand-500">Socialize</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Play with strangers, friends, or in anonymous rooms.</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Social presence is optional. You can appear anonymous or fully social.
                    </p>
                </section>

                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Presence</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {[
                            { id: "anonymous", label: "Anonymous" },
                            { id: "social", label: "Social" }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSocialPresence(item.id)}
                                className={`rounded-2xl border px-4 py-3 text-left ${socialPresence === item.id
                                    ? "border-brand-500 bg-brand-500 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-300"
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Room Modes</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {SOCIAL_MODES.map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setSocialMode(mode)}
                                className={`rounded-2xl border px-4 py-3 text-left ${socialMode === mode
                                    ? "border-brand-500 bg-brand-500 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-300"
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Rooms</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-sm font-semibold text-white">Join Existing Room</p>
                            <input
                                value={roomCode}
                                onChange={(event) => setRoomCode(event.target.value)}
                                className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2"
                                placeholder="Room code"
                            />
                            <button className="mt-3 rounded-2xl bg-brand-500 px-4 py-2 font-semibold text-black">
                                Join Room
                            </button>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                            <p className="text-sm font-semibold text-white">Create Room</p>
                            <p className="mt-2 text-sm text-slate-400">
                                Create a public or private room for duels, team play, or voice chat.
                            </p>
                            <button className="mt-3 rounded-2xl bg-brand-500 px-4 py-2 font-semibold text-black">
                                Create Room
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <div className="space-y-4">
                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Public Options</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                        <p>Anonymous profile toggle</p>
                        <p>Voice chat enable/disable</p>
                        <p>Team or solo matchmaking</p>
                        <p>Stranger battles</p>
                    </div>
                </section>
                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Safety</h3>
                    <p className="mt-2 text-sm text-slate-400">
                        Social mode can stay private, anonymous, or fully visible depending on your choice.
                    </p>
                </section>
            </div>
        </div>
    );

    const renderSelfImprovement = () => (
        <SelfImprovementPanel
            token={token}
            selectedCompanionId={selectedCompanionId}
            onUnauthorized={forceLogout}
            onError={setError}
        />
    );

    const renderSettings = () => (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
                <section className="personax-card p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-brand-500">Settings</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Control privacy, memory, and voice behavior.</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        These are app-level options that shape how the whole experience feels.
                    </p>

                    <div className="mt-5 grid gap-3">
                        {SETTINGS_ITEMS.map((item) => {
                            const keyMap = {
                                "Anonymous social presence": "anonymousProfile",
                                "Companion memory": "companionMemory",
                                "Voice chat": "voiceChat",
                                "Safety filter": "safetyFilter"
                            };
                            const settingKey = keyMap[item.label];
                            return (
                                <label key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-white">{item.label}</p>
                                        <p className="text-sm text-slate-400">{item.description}</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings[settingKey]}
                                        onChange={(event) => setSettings((prev) => ({ ...prev, [settingKey]: event.target.checked }))}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </section>

                {/* Live Preferences Section */}
                <section className="personax-card p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-blue-500">Live Preferences</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Customize your social experience</h3>
                    <p className="mt-2 text-sm text-slate-400">
                        Settings for the Live page and real-time interactions.
                    </p>

                    <div className="mt-5 grid gap-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                            <p className="font-semibold text-white">Identity</p>
                            <p className="text-sm text-slate-400">How others see you in rooms</p>
                            <div className="mt-3 flex gap-2">
                                {["profile", "anonymous", "aiAvatar"].map((id) => (
                                    <button
                                        key={id}
                                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${(settings.socialIdentity || "profile") === id
                                            ? "bg-blue-600 text-white"
                                            : "border border-slate-700 text-slate-400 hover:text-white"
                                            }`}
                                        onClick={() => setSettings((prev) => ({ ...prev, socialIdentity: id }))}
                                    >
                                        {id === "profile" ? "Profile" : id === "anonymous" ? "Anonymous" : "AI Avatar"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                            <div>
                                <p className="font-semibold text-white">Voice Chat</p>
                                <p className="text-sm text-slate-400">Allow voice in live rooms</p>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked={true}
                                onChange={(e) => setSettings((prev) => ({ ...prev, liveVoiceEnabled: e.target.checked }))}
                            />
                        </label>

                        <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                            <div>
                                <p className="font-semibold text-white">Stranger Chat</p>
                                <p className="text-sm text-slate-400">Match with random users</p>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked={true}
                                onChange={(e) => setSettings((prev) => ({ ...prev, strangerChatEnabled: e.target.checked }))}
                            />
                        </label>

                        <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                            <div>
                                <p className="font-semibold text-white">Team Matchmaking</p>
                                <p className="text-sm text-slate-400">Prefer team games over 1v1</p>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked={false}
                                onChange={(e) => setSettings((prev) => ({ ...prev, teamMatchmakingEnabled: e.target.checked }))}
                            />
                        </label>
                    </div>
                </section>
            </div>

            <div className="space-y-4">
                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">AI Providers</h3>
                    <p className="mt-2 text-sm text-slate-400">
                        You can keep NVIDIA for image generation and later add a cheaper provider for chat if needed.
                    </p>
                </section>
                <section className="personax-card p-4">
                    <h3 className="text-lg font-semibold text-white">Current mode</h3>
                    <p className="mt-2 text-sm text-slate-400">
                        {settings.anonymousProfile ? "Anonymous social presence enabled" : "Public social presence enabled"}
                    </p>
                </section>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(182,255,77,0.12),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(122,223,122,0.08),_transparent_18%),linear-gradient(180deg,#111315_0%,#0c0d0f_100%)] text-white">
            <div className="grid min-h-screen xl:grid-cols-[260px_1fr]">
                <aside className="border-r border-slate-800 bg-[#101214] px-5 py-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-lg font-black text-black">PX</div>
                        <div>
                            <p className="text-lg font-black tracking-[0.24em] text-brand-500">PERSONAX</p>
                            <p className="text-xs text-slate-500">Companion dashboard</p>
                        </div>
                    </div>

                    <nav className="mt-8 space-y-3">
                        {NAV_ITEMS.map((item) => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={sidebarButtonClass(item.id, item.accent)}>
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 ${ACCENT_CLASS_MAP[item.accent].bg} text-lg`}>
                                        {item.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{item.label}</p>
                                        <p className="text-xs text-slate-400">{item.sublabel}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Active Companion</p>
                        <p className="mt-2 text-lg font-semibold text-white">{selectedCompanion?.name || "No companion selected"}</p>
                        <p className="mt-1 text-sm text-slate-400">Switch from Home to create or select another companion.</p>
                    </div>
                </aside>

                <div className="flex flex-col">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-brand-500">PersonaX</p>
                            <h1 className="text-2xl font-semibold text-white">AI companion platform</h1>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-300">
                            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2">{user?.name || "Guest"}</span>
                            <span className="rounded-full border border-brand-500 bg-brand-500 px-3 py-2 font-semibold text-black">Online</span>
                            <button
                                type="button"
                                onClick={forceLogout}
                                disabled={isLoggingOut}
                                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 font-semibold text-slate-200 transition hover:border-red-500 hover:text-red-300 disabled:opacity-60"
                            >
                                {isLoggingOut ? "Logging out..." : "Logout"}
                            </button>
                        </div>
                    </header>

                    <section className="flex-1 p-6">
                        {error ? <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

                        {activeTab === "home" && renderHome()}
                        {activeTab === "game-zone" && themedShell("game-zone", renderGameZone())}
                        {activeTab === "socialize" && themedShell("socialize", renderSocialize())}
                        {activeTab === "self-improvement" && themedShell("self-improvement", renderSelfImprovement())}
                        {activeTab === "settings" && themedShell("settings", renderSettings())}
                    </section>
                </div>
            </div>
        </main>
    );
}
