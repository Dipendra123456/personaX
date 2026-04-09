import { useEffect, useState } from "react";

/**
 * VideoGrid Component - WebRTC Video Rendering Stub
 * 
 * This component is a placeholder for WebRTC integration (Agora.io or similar).
 * In Phase 6, this will be extended with actual video/audio streaming.
 * 
 * Currently displays:
 * - Local user video placeholder
 * - Remote participant video placeholders
 * - Mute/camera toggle controls
 * - Responsive grid layout
 */
export default function VideoGrid({
    roomType = "video",
    participants = [],
    onMuteToggle,
    onVideoToggle,
    isMuted = false,
    isVideoEnabled = true
}) {
    const [gridLayout, setGridLayout] = useState("auto");

    // Calculate grid columns based on participant count
    useEffect(() => {
        const count = participants.length + 1; // +1 for local user
        if (count === 1) setGridLayout("grid-cols-1");
        else if (count === 2) setGridLayout("grid-cols-2");
        else if (count <= 4) setGridLayout("grid-cols-2 md:grid-cols-2");
        else setGridLayout("grid-cols-2 md:grid-cols-3");
    }, [participants.length]);

    if (roomType === "chat") {
        // Chat rooms don't show video grid
        return null;
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Video Grid */}
            <div className={`flex-1 grid ${gridLayout} gap-4 p-4 bg-slate-900/20 rounded-lg overflow-auto`}>
                {/* Local Video */}
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 flex items-center justify-center min-h-[240px]">
                    <div className="text-center">
                        {isVideoEnabled ? (
                            <div className="text-5xl mb-2">📷</div>
                        ) : (
                            <div className="text-5xl mb-2">🚫</div>
                        )}
                        <p className="text-sm text-slate-400">You</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {roomType === "video" ? "Video off (WebRTC stub)" : "Audio active"}
                        </p>
                    </div>

                    {/* Indicator Badges */}
                    <div className="absolute top-3 right-3 flex gap-2">
                        <div
                            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${isMuted
                                    ? "bg-red-600/80 text-white"
                                    : "bg-green-600/80 text-white"
                                }`}
                        >
                            {isMuted ? "🔇 Muted" : "🎤 Live"}
                        </div>
                    </div>
                </div>

                {/* Remote Videos */}
                {participants.map((participant, idx) => (
                    <div
                        key={`${participant.userId}-${idx}`}
                        className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-slate-600 flex items-center justify-center min-h-[240px]"
                    >
                        <div className="text-center">
                            <div className="text-4xl mb-2">👤</div>
                            <p className="text-sm text-slate-300">{participant.userName || "User"}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                {roomType === "voice" ? "🎤 Speaking" : "📹 Video"}
                            </p>
                        </div>

                        {/* Online Status */}
                        <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse"></div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="border-t border-slate-700 bg-slate-900/50 p-4 flex items-center justify-center gap-4">
                <button
                    onClick={onMuteToggle}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${isMuted
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                        }`}
                >
                    {isMuted ? "🔇" : "🎤"} {isMuted ? "Unmute" : "Mute"}
                </button>

                {roomType === "video" && (
                    <button
                        onClick={onVideoToggle}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${!isVideoEnabled
                                ? "bg-red-600 hover:bg-red-500 text-white"
                                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                            }`}
                    >
                        {isVideoEnabled ? "📹" : "🚫"} {isVideoEnabled ? "Camera On" : "Camera Off"}
                    </button>
                )}

                <div className="ml-4 px-4 py-2 bg-slate-800 rounded-lg text-xs text-slate-400">
                    💡 <strong>WebRTC Phase 6:</strong> Integrate Agora.io for real video/audio
                </div>
            </div>
        </div>
    );
}
