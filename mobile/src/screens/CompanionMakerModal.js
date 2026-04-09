import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { BEHAVIOR_MODES, GENDER_OPTIONS, TONE_OPTIONS, MOOD_MODES, RELATIONSHIP_GROUPS, COMPANION_AVATAR_EMOJIS } from "../constants/companionOptions";
import { AVATAR_ACCESSORIES, AVATAR_HAIR_COLORS, AVATAR_MOODS, AVATAR_STYLES, buildAvatarPrompt } from "../constants/avatarOptions";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

export default function CompanionMakerModal({ visible, onClose, onCreate, existingCompanion = null }) {
    const token = useAppStore((s) => s.token);
    const [form, setForm] = useState({
        name: "",
        avatar: "😎",
        gender: "female",
        relationshipType: "friend",
        relationshipOther: "",
        tone: "soft",
        toneModes: ["soft"],
        moodModes: [],
        behaviorModes: [],
        avatarSettings: {
            style: "anime",
            hairColor: "brown",
            mood: "calm",
            accessory: "none",
            avatarPrompt: ""
        }
    });
    const [generateAvatarAfterSave, setGenerateAvatarAfterSave] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [openLookField, setOpenLookField] = useState(null);
    const [openFormField, setOpenFormField] = useState(null);
    const [openRelationshipGroup, setOpenRelationshipGroup] = useState(null);

    useEffect(() => {
        if (existingCompanion) {
            setForm({
                ...existingCompanion,
                avatar: existingCompanion.avatar || "😎",
                relationshipType: existingCompanion.relationshipType || "friend",
                relationshipOther: existingCompanion.relationshipOther || "",
                avatarSettings: {
                    style: existingCompanion.avatarSettings?.style || "anime",
                    hairColor: existingCompanion.avatarSettings?.hairColor || "brown",
                    mood: existingCompanion.avatarSettings?.mood || "calm",
                    accessory: existingCompanion.avatarSettings?.accessory || "none",
                    avatarPrompt: existingCompanion.avatarSettings?.avatarPrompt || ""
                },
                tone: existingCompanion.tone || "soft",
                toneModes: existingCompanion.toneModes?.length ? existingCompanion.toneModes : [existingCompanion.tone || "soft"],
                moodModes: existingCompanion.moodModes || [],
                behaviorModes: existingCompanion.behaviorModes || []
            });
        } else {
            setForm({
                name: "",
                avatar: "😎",
                gender: "female",
                relationshipType: "friend",
                relationshipOther: "",
                tone: "soft",
                toneModes: ["soft"],
                moodModes: [],
                behaviorModes: [],
                avatarSettings: {
                    style: "anime",
                    hairColor: "brown",
                    mood: "calm",
                    accessory: "none",
                    avatarPrompt: ""
                }
            });
        }
        setGenerateAvatarAfterSave(true);
        setError("");
    }, [visible, existingCompanion]);

    const submit = async () => {
        if (!form.name.trim()) {
            setError("Companion name is required");
            return;
        }

        setError("");
        setLoading(true);
        try {
            const toneModes = form.toneModes?.length ? form.toneModes : [form.tone || "soft"];

            const payload = {
                ...form,
                relationshipType: form.relationshipType || "friend",
                toneModes,
                tone: toneModes[0],
                avatarSettings: {
                    ...form.avatarSettings,
                    avatarPrompt: form.avatarSettings.avatarPrompt || buildAvatarPrompt({
                        ...form.avatarSettings,
                        gender: form.gender
                    })
                }
            };

            let result;
            if (existingCompanion) {
                result = await api.updateCompanion(existingCompanion._id, payload, token);
            } else {
                result = await api.createCompanion({ ...payload, isAutoCompanion: false }, token);
            }

            if (generateAvatarAfterSave) {
                try {
                    const generated = await api.generateAvatar(result._id, token);
                    result = generated.companion || result;
                } catch (avatarErr) {
                    setError(`Saved companion, but avatar generation failed: ${avatarErr.message || "Unknown error"}`);
                }
            }

            onCreate(result);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create companion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalSheet}>
                    <ScrollView contentContainerStyle={styles.wrap}>
                        <View style={styles.header}>
                            <Pressable onPress={onClose}>
                                <Text style={styles.closeText}>✕</Text>
                            </Pressable>
                            <Text style={styles.title}>{existingCompanion ? "Edit Companion" : "AI Companion Maker"}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Companion Name"
                            placeholderTextColor={colors.textMuted}
                            value={form.name}
                            onChangeText={(v) => setForm({ ...form, name: v })}
                        />

                        <Text style={styles.label}>Companion Emoji</Text>
                        <View style={styles.optionWrap}>
                            {COMPANION_AVATAR_EMOJIS.map((emoji) => (
                                <Pressable
                                    key={emoji}
                                    style={[styles.emojiChip, form.avatar === emoji && styles.optionChipActive]}
                                    onPress={() => setForm({ ...form, avatar: emoji })}
                                >
                                    <Text style={styles.emojiText}>{emoji}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Or type your own emoji"
                            placeholderTextColor={colors.textMuted}
                            value={form.avatar}
                            onChangeText={(v) => setForm({ ...form, avatar: v.trim() })}
                            maxLength={4}
                        />

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.optionWrap}>
                            {GENDER_OPTIONS.map((opt) => (
                                <Pressable
                                    key={opt}
                                    style={[styles.optionChip, form.gender === opt && styles.optionChipActive]}
                                    onPress={() => setForm({ ...form, gender: opt })}
                                >
                                    <Text style={styles.optionText}>{formatOptionLabel(opt)}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.formGrid}>
                            <View style={styles.formGridItem}>
                                <MultiSelectDropdown
                                    label="Relationship Types"
                                    values={form.relationshipType ? [form.relationshipType] : []}
                                    singleSelect
                                    open={openFormField === "relationship"}
                                    onToggle={() => setOpenFormField((current) => (current === "relationship" ? null : "relationship"))}
                                    renderCustomPanel={() => (
                                        <View>
                                            {RELATIONSHIP_GROUPS.map((group) => {
                                                const active = form.relationshipType === group.value;
                                                const expanded = openRelationshipGroup === group.value;
                                                return (
                                                    <View key={group.value} style={styles.groupBlock}>
                                                        <Pressable
                                                            style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                                                            onPress={() => {
                                                                if (group.subOptions?.length) {
                                                                    setOpenRelationshipGroup((prev) => (prev === group.value ? null : group.value));
                                                                    return;
                                                                }
                                                                setForm({ ...form, relationshipType: group.value });
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownOptionText}>{formatOptionLabel(group.label)}</Text>
                                                            {group.subOptions?.length ? (
                                                                <Text style={styles.dropdownCaret}>
                                                                    {expanded ? "▲" : "▼"}
                                                                </Text>
                                                            ) : null}
                                                        </Pressable>
                                                        {expanded && group.subOptions?.length ? (
                                                            <View style={styles.subOptionsWrap}>
                                                                {group.subOptions.map((sub) => {
                                                                    const subActive = form.relationshipType === sub;
                                                                    return (
                                                                        <Pressable
                                                                            key={sub}
                                                                            style={[styles.subOptionChip, subActive && styles.optionChipActive]}
                                                                            onPress={() => setForm({ ...form, relationshipType: sub })}
                                                                        >
                                                                            <Text style={styles.optionText}>{formatOptionLabel(sub)}</Text>
                                                                        </Pressable>
                                                                    );
                                                                })}
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                />
                            </View>

                            <View style={styles.formGridItem}>
                                <MultiSelectDropdown
                                    label="Tone Options"
                                    values={form.toneModes || []}
                                    options={TONE_OPTIONS.filter((item) => item !== "auto")}
                                    open={openFormField === "tone"}
                                    onToggle={() => setOpenFormField((current) => (current === "tone" ? null : "tone"))}
                                    onChange={(next) => setForm({ ...form, toneModes: next })}
                                />
                            </View>

                            <View style={styles.formGridItem}>
                                <MultiSelectDropdown
                                    label="Moods"
                                    values={form.moodModes || []}
                                    options={MOOD_MODES}
                                    open={openFormField === "moods"}
                                    onToggle={() => setOpenFormField((current) => (current === "moods" ? null : "moods"))}
                                    onChange={(next) => setForm({ ...form, moodModes: next })}
                                />
                            </View>

                            <View style={styles.formGridItem}>
                                <MultiSelectDropdown
                                    label="Behavior Modes"
                                    values={form.behaviorModes || []}
                                    options={BEHAVIOR_MODES}
                                    open={openFormField === "behavior"}
                                    onToggle={() => setOpenFormField((current) => (current === "behavior" ? null : "behavior"))}
                                    onChange={(next) => setForm({ ...form, behaviorModes: next })}
                                />
                            </View>
                        </View>

                        {form.relationshipType === "other" && (
                            <TextInput
                                style={styles.input}
                                placeholder="Other relationship"
                                placeholderTextColor={colors.textMuted}
                                value={form.relationshipOther}
                                onChangeText={(v) => setForm({ ...form, relationshipOther: v })}
                            />
                        )}

                        <View style={styles.divider} />
                        <Text style={styles.label}>AI Look Generator</Text>

                        <View style={styles.lookGrid}>
                            <View style={styles.lookGridItem}>
                                <LookDropdown
                                    compact
                                    label="Style"
                                    value={form.avatarSettings.style}
                                    options={AVATAR_STYLES}
                                    open={openLookField === "style"}
                                    onToggle={() => setOpenLookField((current) => (current === "style" ? null : "style"))}
                                    onPick={(value) => setForm({ ...form, avatarSettings: { ...form.avatarSettings, style: value } })}
                                />
                            </View>
                            <View style={styles.lookGridItem}>
                                <LookDropdown
                                    compact
                                    label="Hair"
                                    value={form.avatarSettings.hairColor}
                                    options={AVATAR_HAIR_COLORS}
                                    open={openLookField === "hairColor"}
                                    onToggle={() => setOpenLookField((current) => (current === "hairColor" ? null : "hairColor"))}
                                    onPick={(value) => setForm({ ...form, avatarSettings: { ...form.avatarSettings, hairColor: value } })}
                                />
                            </View>
                            <View style={styles.lookGridItem}>
                                <LookDropdown
                                    compact
                                    label="Expression"
                                    value={form.avatarSettings.mood}
                                    options={AVATAR_MOODS}
                                    open={openLookField === "mood"}
                                    onToggle={() => setOpenLookField((current) => (current === "mood" ? null : "mood"))}
                                    onPick={(value) => setForm({ ...form, avatarSettings: { ...form.avatarSettings, mood: value } })}
                                />
                            </View>
                            <View style={styles.lookGridItem}>
                                <LookDropdown
                                    compact
                                    label="Accessory"
                                    value={form.avatarSettings.accessory}
                                    options={AVATAR_ACCESSORIES}
                                    open={openLookField === "accessory"}
                                    onToggle={() => setOpenLookField((current) => (current === "accessory" ? null : "accessory"))}
                                    onPick={(value) => setForm({ ...form, avatarSettings: { ...form.avatarSettings, accessory: value } })}
                                />
                            </View>
                        </View>

                        <TextInput
                            style={[styles.input, styles.promptInput]}
                            placeholder="Avatar generator prompt"
                            placeholderTextColor={colors.textMuted}
                            value={form.avatarSettings.avatarPrompt}
                            onChangeText={(v) => setForm({ ...form, avatarSettings: { ...form.avatarSettings, avatarPrompt: v } })}
                            multiline
                        />

                        <Pressable
                            style={styles.secondaryBtn}
                            onPress={() => {
                                const prompt = buildAvatarPrompt({ ...form.avatarSettings, gender: form.gender });
                                setForm({ ...form, avatarSettings: { ...form.avatarSettings, avatarPrompt: prompt } });
                            }}
                        >
                            <Text style={styles.secondaryBtnText}>Auto-generate prompt from look settings</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.optionChip, styles.toggleChip, generateAvatarAfterSave && styles.optionChipActive]}
                            onPress={() => setGenerateAvatarAfterSave((prev) => !prev)}
                        >
                            <Text style={styles.optionText}>
                                {generateAvatarAfterSave ? "Avatar generation: ON" : "Avatar generation: OFF"}
                            </Text>
                        </Pressable>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <Pressable style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
                            <Text style={styles.submitText}>{loading ? "Saving..." : existingCompanion ? "Save Companion" : "Create Companion"}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: { flex: 1, backgroundColor: colors.backdrop, alignItems: "center" },
    modalSheet: { width: "100%", maxWidth: 430, height: "100%", backgroundColor: colors.primary },
    wrap: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100, backgroundColor: colors.primary },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    closeText: { color: colors.accent, fontSize: 28, fontWeight: "bold" },
    title: { color: colors.text, fontSize: 24, fontWeight: "800" },
    input: { backgroundColor: colors.inputBg, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
    label: { color: colors.textSecondary, fontWeight: "700", marginBottom: 8, marginTop: 8 },
    labelSmall: { color: colors.textMuted, fontWeight: "700", marginBottom: 8, marginTop: 2, fontSize: 12 },
    divider: { borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 12 },
    optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    optionChip: { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    toggleChip: { marginBottom: 14, alignSelf: "flex-start" },
    emojiChip: { width: 44, height: 44, backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    emojiText: { fontSize: 20 },
    optionChipActive: { backgroundColor: colors.tertiary, borderColor: colors.accent },
    optionText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },
    dropdownButton: { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dropdownButtonText: { color: colors.text, fontWeight: "700", textTransform: "capitalize" },
    dropdownCaret: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
    dropdownPanel: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, overflow: "hidden" },
    dropdownScroll: { maxHeight: 160 },
    dropdownOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownOptionActive: { backgroundColor: colors.tertiary },
    dropdownOptionText: { color: colors.textSecondary, fontWeight: "700", textTransform: "capitalize" },
    groupBlock: { borderBottomWidth: 1, borderBottomColor: colors.border },
    subOptionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.tertiary },
    subOptionChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 6 },
    lookGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
    lookGridItem: { width: "48%" },
    formGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
    formGridItem: { width: "48%" },
    compactDropdownButton: { paddingHorizontal: 10, paddingVertical: 8 },
    compactDropdownText: { fontSize: 12 },
    compactDropdownScroll: { maxHeight: 120 },
    promptInput: { minHeight: 90, textAlignVertical: "top" },
    secondaryBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, alignItems: "center", paddingVertical: 10, marginBottom: 10 },
    secondaryBtnText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
    submitBtn: { backgroundColor: colors.accent, borderRadius: 10, alignItems: "center", paddingVertical: 12, marginTop: 20 },
    submitText: { color: colors.buttonText, fontWeight: "800" },
    error: { color: colors.error, marginBottom: 8 }
});

function LookDropdown({ label, value, options, open, onToggle, onPick, compact = false }) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.labelSmall}>{label}</Text>
            <Pressable style={[styles.dropdownButton, compact && styles.compactDropdownButton]} onPress={onToggle}>
                <Text style={[styles.dropdownButtonText, compact && styles.compactDropdownText]}>{formatOptionLabel(value)}</Text>
                <Text style={styles.dropdownCaret}>{open ? "▲" : "▼"}</Text>
            </Pressable>
            {open ? (
                <View style={styles.dropdownPanel}>
                    <ScrollView style={[styles.dropdownScroll, compact && styles.compactDropdownScroll]} nestedScrollEnabled>
                        {options.map((option) => (
                            <Pressable
                                key={option}
                                style={[styles.dropdownOption, value === option && styles.dropdownOptionActive]}
                                onPress={() => onPick(option)}
                            >
                                <Text style={styles.dropdownOptionText}>{formatOptionLabel(option)}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

function MultiSelectDropdown({ label, values, options, open, onToggle, onChange, renderCustomPanel }) {
    const summary = values.length ? `${values.length} selected` : "Select options";

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>{label}</Text>
            <Pressable style={styles.dropdownButton} onPress={onToggle}>
                <Text style={styles.dropdownButtonText}>{summary}</Text>
                <Text style={styles.dropdownCaret}>{open ? "▲" : "▼"}</Text>
            </Pressable>
            {open ? (
                <View style={styles.dropdownPanel}>
                    {renderCustomPanel ? renderCustomPanel() : (
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                            {options.map((option) => {
                                const active = values.includes(option);
                                return (
                                    <Pressable
                                        key={option}
                                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                                        onPress={() => {
                                            const next = active
                                                ? values.filter((item) => item !== option)
                                                : [...values, option];
                                            onChange?.(next);
                                        }}
                                    >
                                        <Text style={styles.dropdownOptionText}>{formatOptionLabel(option)}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            ) : null}
        </View>
    );
}

function formatOptionLabel(value) {
    const text = String(value || "").replace(/-/g, " ").trim();
    if (!text) {
        return "";
    }
    return text
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
