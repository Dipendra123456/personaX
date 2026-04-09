export default function CompanionList({ companions, selectedId, onSelect }) {
    return (
        <div className="personax-card p-4">
            <h2 className="mb-3 text-lg font-semibold text-brand-500">Companions</h2>
            <div className="space-y-2">
                {companions.map((companion) => {
                    const selected = companion._id === selectedId;
                    const avatarFallbackSeed = companion.name;
                    const avatarStyle = companion.avatarSettings?.style || "anime";
                    const fallbackAvatarUrl = `https://api.dicebear.com/9.x/${avatarStyle === "realistic"
                        ? "micah"
                        : avatarStyle === "cartoon"
                            ? "avataaars-neutral"
                            : avatarStyle === "cyberpunk"
                                ? "bottts-neutral"
                                : avatarStyle === "fantasy"
                                    ? "adventurer-neutral"
                                    : avatarStyle === "minimal"
                                        ? "personas"
                                        : "lorelei-neutral"
                        }/svg?seed=${encodeURIComponent(avatarFallbackSeed)}&backgroundColor=1f2937&radius=50`;
                    const avatarUrl = companion.customAvatarUrl || companion.avatar || companion.avatarSettings?.avatarImageUrl || fallbackAvatarUrl;
                    const companionType = companion.isAutoCompanion ? "Quick companion" : "Custom companion";

                    return (
                        <button
                            key={companion._id}
                            onClick={() => onSelect(companion._id)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${selected
                                ? "border-brand-500 bg-[linear-gradient(135deg,rgba(43,227,106,0.18),rgba(43,227,106,0.04))] text-white shadow-[0_0_0_1px_rgba(74,222,128,0.20)]"
                                : "border-slate-700 bg-slate-900/70 text-slate-100 hover:border-brand-500/50 hover:bg-slate-800"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={avatarUrl}
                                    alt={`${companion.name} avatar`}
                                    className="h-14 w-14 rounded-2xl border border-slate-600 bg-slate-800 object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white">{companion.name}</p>
                                    <p className={`text-sm ${selected ? "text-emerald-100" : "text-slate-300"}`}>{companionType}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
