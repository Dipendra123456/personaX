import { useState } from "react";

export default function RoomCard({ room, onJoin, isJoining }) {
    const typeEmojis = {
        chat: "💬",
        voice: "🎤",
        video: "🎥"
    };

    const typeColors = {
        chat: "from-blue-500/20 to-cyan-500/20",
        voice: "from-orange-500/20 to-yellow-500/20",
        video: "from-red-500/20 to-pink-500/20"
    };

    return (
        <div className="group personal-card overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-4 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
            {/* Header with type badge */}
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white truncate">{room.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{new Date(room.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className={`flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br ${typeColors[room.type]}`}>
                    {typeEmojis[room.type]}
                </div>
            </div>

            {/* User count and type */}
            <div className="mb-3 flex items-center gap-2">
                <span className="inline-block px-2 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200">
                    {room.userCount} user{room.userCount !== 1 ? "s" : ""}
                </span>
                <span className="inline-block px-2 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 capitalize">
                    {room.type}
                </span>
                {room.hasAI && (
                    <span className="inline-block px-2 py-1 rounded-lg bg-purple-900/50 text-xs font-semibold text-purple-300">
                        AI
                    </span>
                )}
            </div>

            {/* User avatars preview (showing first 3) */}
            {room.users && room.users.length > 0 && (
                <div className="mb-4 flex items-center gap-1">
                    {room.users.slice(0, 3).map((user, idx) => (
                        <div
                            key={idx}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-bold text-white border border-slate-600"
                            title={user.name}
                        >
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {room.users.length > 3 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                            +{room.users.length - 3}
                        </div>
                    )}
                </div>
            )}

            {/* Join button */}
            <button
                onClick={() => onJoin(room.id)}
                disabled={isJoining}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-2.5 font-semibold text-white transition-all hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isJoining ? "Joining..." : "Join Room"}
            </button>
        </div>
    );
}
