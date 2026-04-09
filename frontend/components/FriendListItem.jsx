export default function FriendListItem({ friend, isOnline, onJoin, onInvite, onMessage }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/50 p-3 hover:bg-slate-900 transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white flex-shrink-0">
                    {friend.friend?.name?.charAt(0)?.toUpperCase() || "?"}
                    {isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border border-slate-900"></div>
                    )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white text-sm truncate">
                        {friend.friend?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400">
                        {isOnline ? "🟢 Online" : "🔘 Offline"}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {isOnline && (
                    <>
                        <button
                            onClick={() => onJoin?.(friend.friend?.id)}
                            className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all"
                            title="Join voice/video"
                        >
                            🎤
                        </button>
                        <button
                            onClick={() => onInvite?.(friend.friend?.id)}
                            className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-all"
                            title="Invite to room"
                        >
                            ➕
                        </button>
                    </>
                )}
                <button
                    onClick={() => onMessage?.(friend.friend?.id)}
                    className="p-2 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                    title="Send message"
                >
                    💬
                </button>
            </div>
        </div>
    );
}
