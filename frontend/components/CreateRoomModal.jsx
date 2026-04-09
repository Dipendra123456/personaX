import { useState } from "react";

export default function CreateRoomModal({ isOpen, onClose, onCreate, isCreating }) {
    const [roomTitle, setRoomTitle] = useState("");
    const [roomType, setRoomType] = useState("chat");
    const [includeAI, setIncludeAI] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (roomTitle.trim()) {
            onCreate({
                title: roomTitle,
                type: roomType,
                aiCompanionId: includeAI ? "default" : null
            });
            setRoomTitle("");
            setRoomType("chat");
            setIncludeAI(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="personax-card w-full max-w-md rounded-3xl border border-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Create Your Space</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Room Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Room Title
                        </label>
                        <input
                            type="text"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            placeholder="e.g., Late Night Chill, Study Buddies"
                            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Room Type */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Room Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {["chat", "voice", "video"].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setRoomType(type)}
                                    className={`rounded-lg px-3 py-2 font-semibold transition-all ${roomType === type
                                            ? "bg-blue-600 text-white"
                                            : "border border-slate-600 text-slate-300 hover:border-slate-500"
                                        }`}
                                >
                                    {type === "chat" ? "💬 Chat" : type === "voice" ? "🎤 Voice" : "🎥 Video"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Companion Toggle */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeAI}
                            onChange={(e) => setIncludeAI(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-300">
                            Include AI Companion
                        </span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!roomTitle.trim() || isCreating}
                            className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 font-semibold text-white hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isCreating ? "Creating..." : "Create Room"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
