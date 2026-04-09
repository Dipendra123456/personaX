import { useMemo, useState } from "react";
import { MOOD_MODES, TONE_OPTIONS, getRelationshipOptions } from "../../shared/constants/companionOptions";
import { AVATAR_ACCESSORIES, AVATAR_HAIR_COLORS, AVATAR_MOODS, AVATAR_STYLES, buildAvatarImageUrl, buildAvatarPrompt } from "../../shared/constants/avatarOptions";

const DEFAULT_QUICK_COMPANIONS = [
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

const initial = {
    name: "",
    gender: "female",
    relationshipType: "friend",
    tone: "soft",
    isAutoCompanion: false,
    moodModes: [],
    avatarSettings: {
        style: "anime",
        hairColor: "brown",
        mood: "calm",
        accessory: "none",
        skinTone: "medium",
        outfit: "casual",
        avatarPrompt: ""
    }
};

const toEditorForm = (companion) => ({
    name: companion?.name || "",
    gender: companion?.gender || "female",
    relationshipType: companion?.relationshipType || "friend",
    tone: companion?.tone || "soft",
    isAutoCompanion: false,
    moodModes: Array.isArray(companion?.moodModes) ? companion.moodModes : [],
    avatarSettings: {
        style: companion?.avatarSettings?.style || "anime",
        hairColor: companion?.avatarSettings?.hairColor || "brown",
        mood: companion?.avatarSettings?.mood || "calm",
        accessory: companion?.avatarSettings?.accessory || "none",
        skinTone: companion?.avatarSettings?.skinTone || "medium",
        outfit: companion?.avatarSettings?.outfit || "casual",
        avatarPrompt: companion?.avatarSettings?.avatarPrompt || ""
    }
});

export default function CreateCompanionForm({
    onCreate,
    onUpdate,
    onDelete,
    onMakeQuick,
    onModeChange,
    quickCompanions = [],
    customCompanions = [],
    selectedId,
    onSelect
}) {
    const [form, setForm] = useState(initial);
    const [activeTab, setActiveTab] = useState("quick");
    const [editorMode, setEditorMode] = useState("create");
    const [editingCompanionId, setEditingCompanionId] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    const switchTab = (mode) => {
        setActiveTab(mode);
        setOpenMenuId(null);
        onModeChange?.(mode);

        if (mode === "quick") {
            setShowEditor(false);
            setEditorMode("create");
            setEditingCompanionId(null);
            setForm(initial);
        }
    };

    const avatarPreviewUrl = buildAvatarImageUrl({ ...form.avatarSettings, gender: form.gender }, form.name || "personax");
    const relationshipOptions = useMemo(() => getRelationshipOptions(form.gender), [form.gender]);
    const visibleQuickCompanions = quickCompanions.length > 0 ? quickCompanions : DEFAULT_QUICK_COMPANIONS;

    const toggleCreateEditor = () => {
        setOpenMenuId(null);

        if (showEditor && editorMode === "create") {
            setShowEditor(false);
            setForm(initial);
            return;
        }

        setEditorMode("create");
        setEditingCompanionId(null);
        setForm(initial);
        setShowEditor(true);
    };

    const handleEditCompanion = (companion) => {
        setEditorMode("edit");
        setEditingCompanionId(companion._id);
        setForm(toEditorForm(companion));
        setShowEditor(true);
        setOpenMenuId(null);
        onSelect?.(companion._id);
    };

    const handleDeleteCompanion = async (companion) => {
        const confirmed = window.confirm(`Delete ${companion.name}? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        await onDelete?.(companion._id);
        setOpenMenuId(null);

        if (editingCompanionId === companion._id) {
            setEditorMode("create");
            setEditingCompanionId(null);
            setForm(initial);
            setShowEditor(false);
        }
    };

    const handleMakeQuickCompanion = async (companion) => {
        await onMakeQuick?.(companion);
        setOpenMenuId(null);

        if (editingCompanionId === companion._id) {
            setEditorMode("create");
            setEditingCompanionId(null);
            setForm(initial);
            setShowEditor(false);
        }
    };

    const closeEditEditor = () => {
        setEditorMode("create");
        setEditingCompanionId(null);
        setForm(initial);
        setShowEditor(false);
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
            return;
        }

        const payload = {
            ...form,
            personality: {
                humorLevel: 50,
                aggressionLevel: 20,
                emotionalLevel: 60,
                dominanceLevel: 40
            }
        };

        if (editorMode === "edit" && editingCompanionId) {
            await onUpdate?.(editingCompanionId, payload);
        } else {
            await onCreate(payload);
        }

        setEditorMode("create");
        setEditingCompanionId(null);
        setShowEditor(false);
        setForm(initial);
    };

    return (
        <form className="personax-card p-4" onSubmit={submit}>
            <h2 className="mb-3 text-lg font-semibold text-brand-500">Companions</h2>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
                    <button
                        type="button"
                        onClick={() => switchTab("quick")}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === "quick"
                            ? "bg-brand-500 text-black shadow-sm"
                            : "text-slate-400"
                            }`}
                    >
                        Quick Companion
                    </button>
                    <button
                        type="button"
                        onClick={() => switchTab("custom")}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === "custom"
                            ? "bg-brand-500 text-black shadow-sm"
                            : "text-slate-400"
                            }`}
                    >
                        Custom Companion
                    </button>
                </div>

                {activeTab === "quick" ? (
                    <>
                        <p className="text-xs text-emerald-100/60">Default quick companions</p>
                        <div className="space-y-2">
                            {visibleQuickCompanions.map((companion) => {
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

                                return (
                                    <button
                                        key={companion._id}
                                        type="button"
                                        onClick={() => onSelect?.(companion._id)}
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
                                                <p className={`text-sm ${selected ? "text-emerald-100" : "text-slate-300"}`}>Quick companion</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-emerald-100/60">Your custom companions</p>

                        <div className="space-y-2">
                            {customCompanions.length > 0 ? customCompanions.map((companion) => {
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

                                return (
                                    <div
                                        key={companion._id}
                                        className={`relative w-full rounded-2xl border p-3 text-left transition ${selected
                                            ? "border-brand-500 bg-[linear-gradient(135deg,rgba(43,227,106,0.18),rgba(43,227,106,0.04))] text-white shadow-[0_0_0_1px_rgba(74,222,128,0.20)]"
                                            : "border-slate-700 bg-slate-900/70 text-slate-100 hover:border-brand-500/50 hover:bg-slate-800"
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onSelect?.(companion._id)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={avatarUrl}
                                                    alt={`${companion.name} avatar`}
                                                    className="h-14 w-14 rounded-2xl border border-slate-600 bg-slate-800 object-cover"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-white">{companion.name}</p>
                                                    <p className={`text-sm ${selected ? "text-emerald-100" : "text-slate-300"}`}>Custom companion</p>
                                                </div>
                                            </div>
                                        </button>

                                        <div className="absolute right-3 top-3">
                                            <button
                                                type="button"
                                                onClick={() => setOpenMenuId((current) => (current === companion._id ? null : companion._id))}
                                                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                                                title="Companion options"
                                            >
                                                ...
                                            </button>
                                            {openMenuId === companion._id ? (
                                                <div className="absolute right-0 mt-1 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMakeQuickCompanion(companion)}
                                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-300 hover:bg-emerald-500/10"
                                                    >
                                                        Make quick
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditCompanion(companion)}
                                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCompanion(companion)}
                                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                                    No custom companions yet.
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={toggleCreateEditor}
                            className="w-full rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-300 hover:bg-brand-500/20"
                        >
                            {showEditor && editorMode === "create" ? "- New Companion" : "+ New Companion"}
                        </button>

                        {showEditor ? (
                            <>
                                <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                                    <p className="text-sm font-medium text-white">
                                        {editorMode === "edit" ? "Edit companion" : "Create companion"}
                                    </p>
                                    {editorMode === "edit" ? (
                                        <button
                                            type="button"
                                            onClick={closeEditEditor}
                                            className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                                        >
                                            Close
                                        </button>
                                    ) : null}
                                </div>

                                <input
                                    className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                />

                                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/25 p-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={avatarPreviewUrl}
                                            alt="Avatar preview"
                                            className="h-20 w-20 rounded-2xl border border-emerald-400/20 bg-emerald-100/80 object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-white">Avatar preview</p>
                                            <p className="text-xs text-emerald-100/70">
                                                Custom companions will auto-generate an image after creation.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <select
                                    className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                    value={form.gender}
                                    onChange={(event) => {
                                        const nextGender = event.target.value;
                                        const nextRelationshipOptions = getRelationshipOptions(nextGender);
                                        setForm((prev) => ({
                                            ...prev,
                                            gender: nextGender,
                                            relationshipType: nextRelationshipOptions.includes(prev.relationshipType)
                                                ? prev.relationshipType
                                                : nextRelationshipOptions[0] || "friend"
                                        }));
                                    }}
                                >
                                    <option value="auto">Gender: Auto</option>
                                    <option value="male">Gender: Male</option>
                                    <option value="female">Gender: Female</option>
                                    <option value="non-binary">Gender: Non-binary</option>
                                    <option value="other">Gender: Other</option>
                                </select>

                                <select
                                    className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                    value={form.relationshipType}
                                    onChange={(event) => setForm((prev) => ({ ...prev, relationshipType: event.target.value }))}
                                >
                                    {relationshipOptions.map((relationship) => (
                                        <option key={relationship} value={relationship}>
                                            {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                    value={form.tone}
                                    onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
                                >
                                    {TONE_OPTIONS.filter((value) => value !== "auto").map((tone) => (
                                        <option key={tone} value={tone}>
                                            {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                        </option>
                                    ))}
                                </select>

                                <div>
                                    <p className="mb-2 text-sm font-medium text-emerald-100/80">Mood modes</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {MOOD_MODES.map((mood) => {
                                            const active = form.moodModes.includes(mood);
                                            return (
                                                <button
                                                    key={mood}
                                                    type="button"
                                                    onClick={() =>
                                                        setForm((prev) => {
                                                            const nextModes = prev.moodModes.includes(mood)
                                                                ? prev.moodModes.filter((value) => value !== mood)
                                                                : [...prev.moodModes, mood];
                                                            return { ...prev, moodModes: nextModes };
                                                        })
                                                    }
                                                    className={`rounded-xl border px-3 py-2 text-sm transition ${active
                                                        ? "border-emerald-400 bg-emerald-500 text-slate-950"
                                                        : "border-emerald-500/20 bg-slate-950 text-emerald-100/80 hover:bg-emerald-950"
                                                        }`}
                                                >
                                                    {mood}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-emerald-100/55">
                                        You can turn on multiple moods together. Leave this empty to let the companion adapt automatically.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-dashed border-emerald-500/25 p-3">
                                    <p className="mb-2 text-sm font-medium text-emerald-100/80">Avatar customization</p>
                                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-emerald-950/25 p-3">
                                        <img
                                            src={avatarPreviewUrl}
                                            alt="Avatar preview"
                                            className="h-24 w-24 rounded-2xl border border-emerald-400/20 bg-emerald-100/80 object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white">Live preview</p>
                                            <p className="text-xs text-emerald-100/70">
                                                This is a generated character preview based on the current settings.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <select
                                            className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                            value={form.avatarSettings.style}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, style: event.target.value }
                                                }))
                                            }
                                        >
                                            {AVATAR_STYLES.map((style) => (
                                                <option key={style} value={style}>
                                                    Style: {style}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            className="w-full rounded-xl border border-emerald-500/20 bg-slate-950 px-3 py-2 text-white"
                                            value={form.avatarSettings.hairColor}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, hairColor: event.target.value }
                                                }))
                                            }
                                        >
                                            {AVATAR_HAIR_COLORS.map((color) => (
                                                <option key={color} value={color}>
                                                    Hair: {color}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                            value={form.avatarSettings.mood}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, mood: event.target.value }
                                                }))
                                            }
                                        >
                                            {AVATAR_MOODS.map((mood) => (
                                                <option key={mood} value={mood}>
                                                    Mood: {mood}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                            value={form.avatarSettings.accessory}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, accessory: event.target.value }
                                                }))
                                            }
                                        >
                                            {AVATAR_ACCESSORIES.map((accessory) => (
                                                <option key={accessory} value={accessory}>
                                                    Accessory: {accessory}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <input
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                            placeholder="Skin tone"
                                            value={form.avatarSettings.skinTone}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, skinTone: event.target.value }
                                                }))
                                            }
                                        />
                                        <input
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                            placeholder="Outfit"
                                            value={form.avatarSettings.outfit}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    avatarSettings: { ...prev.avatarSettings, outfit: event.target.value }
                                                }))
                                            }
                                        />
                                    </div>

                                    <textarea
                                        className="mt-2 h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                        placeholder="Avatar generator prompt"
                                        value={form.avatarSettings.avatarPrompt}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                avatarSettings: { ...prev.avatarSettings, avatarPrompt: event.target.value }
                                            }))
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="mt-2 w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                avatarSettings: {
                                                    ...prev.avatarSettings,
                                                    avatarPrompt: buildAvatarPrompt({ ...prev.avatarSettings, gender: prev.gender })
                                                }
                                            }))
                                        }
                                    >
                                        Auto-generate prompt from avatar settings
                                    </button>

                                    <p className="mt-2 text-xs text-slate-500">
                                        Gender is included in the avatar prompt so the generated character better matches the companion.
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                        If the image service is unavailable, the preview still shows a character from the settings.
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                        This prompt can be sent to an AI image tool later to generate the companion avatar.
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                        After you click Create, the backend will call the image generator and save the final avatar on the companion.
                                    </p>
                                </div>
                                <button className="w-full rounded-xl bg-brand-500 px-3 py-2 font-medium text-white hover:bg-brand-700">
                                    {editorMode === "edit" ? "Save Changes" : "Create"}
                                </button>
                            </>
                        ) : null}
                    </>
                )}
            </div>
        </form>
    );
}
