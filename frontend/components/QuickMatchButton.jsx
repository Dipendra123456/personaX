import { useState } from "react";

export default function QuickMatchButton({ type, isSearching, onStartSearch, onCancel }) {
    const typeInfo = {
        chat: { emoji: "💬", label: "Random Chat", color: "from-blue-600 to-cyan-600" },
        voice: { emoji: "🎤", label: "Random Voice", color: "from-orange-600 to-yellow-600" },
        video: { emoji: "🎥", label: "Random Video", color: "from-red-600 to-pink-600" }
    };

    const info = typeInfo[type];

    return (
        <button
            onClick={isSearching ? onCancel : () => onStartSearch(type)}
            disabled={isSearching && !onCancel}
            className={`w-full rounded-2xl px-6 py-4 font-semibold text-white transition-all ${isSearching
                    ? `bg-gradient-to-r ${info.color} animate-pulse cursor-pointer`
                    : `bg-gradient-to-r ${info.color} hover:shadow-lg hover:shadow-slate-900/50`
                }`}
        >
            <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{info.emoji}</span>
                <span>{isSearching ? "Searching..." : info.label}</span>
            </div>
        </button>
    );
}
