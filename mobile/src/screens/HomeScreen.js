import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import { QUICK_EMOJIS } from "../constants/companionOptions";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";
import CompanionMakerModal from "./CompanionMakerModal";

const COMPANIONS_CACHE_KEY = "personax-mobile-companions-cache";
const getCompanionsCacheKey = (userId) => `${COMPANIONS_CACHE_KEY}:${userId || "guest"}`;
const LOCAL_FALLBACK_COMPANIONS = [
    { _id: "local-quick-1", name: "Dipendra", avatar: "🧑", isAutoCompanion: true },
    { _id: "local-quick-2", name: "Mia Khalifa", avatar: "👩", isAutoCompanion: true }
];


export default function HomeScreen() {
    const token = useAppStore((s) => s.token);
    const user = useAppStore((s) => s.user);
    const companions = useAppStore((s) => s.companions);
    const selectedCompanionId = useAppStore((s) => s.selectedCompanionId);
    const setCompanions = useAppStore((s) => s.setCompanions);
    const selectCompanion = useAppStore((s) => s.selectCompanion);
    const clearAuth = useAppStore((s) => s.clearAuth);

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showEmojiRow, setShowEmojiRow] = useState(false);
    const [makerModalVisible, setMakerModalVisible] = useState(false);
    const [editingCompanion, setEditingCompanion] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);

    const selectedCompanion = companions.find((c) => c._id === selectedCompanionId);

    const cacheCompanions = async (list) => {
        try {
            await AsyncStorage.setItem(getCompanionsCacheKey(user?.id), JSON.stringify(list || []));
        } catch {
            // Ignore cache write errors; app can still function with in-memory state.
        }
    };

    const readCachedCompanions = async () => {
        try {
            const raw = await AsyncStorage.getItem(getCompanionsCacheKey(user?.id));
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const mergeCompanions = (serverList = [], cachedList = []) => {
        const merged = new Map();

        cachedList.forEach((item) => {
            if (item?._id) {
                merged.set(item._id, item);
            }
        });

        serverList.forEach((item) => {
            if (item?._id) {
                merged.set(item._id, item);
            }
        });

        return Array.from(merged.values());
    };

    const buildCompanionDescription = (companion) => {
        if (!companion) {
            return "Select a companion to start chatting.";
        }

        const relationship = String(companion.relationshipType || "companion").replace(/-/g, " ");
        const tone = String(companion.toneModes?.[0] || companion.tone || "supportive");
        const moods = Array.isArray(companion.moodModes) && companion.moodModes.length > 0
            ? companion.moodModes.slice(0, 2).join(" and ")
            : "calm";

        return `${companion.name} is your ${relationship} companion with a ${tone} tone and ${moods} mood.`;
    };

    useEffect(() => {
        const load = async () => {
            const cached = await readCachedCompanions();
            if (cached.length > 0 && companions.length === 0) {
                setCompanions(cached);
                if (!selectedCompanionId && cached[0]?._id) {
                    selectCompanion(cached[0]._id);
                }
            }

            try {
                const list = await api.listCompanions(token);
                const merged = mergeCompanions(list, cached);
                setCompanions(merged);
                await cacheCompanions(merged);
                if (!selectedCompanionId && merged[0]?._id) {
                    selectCompanion(merged[0]._id);
                    setMessages([]);
                }
                setError("");
            } catch (err) {
                if (cached.length === 0) {
                    setCompanions(LOCAL_FALLBACK_COMPANIONS);
                    selectCompanion(LOCAL_FALLBACK_COMPANIONS[0]._id);
                    await cacheCompanions(LOCAL_FALLBACK_COMPANIONS);
                }
                setError("Could not sync companions from server. Showing saved/local companions.");
            }
        };
        load();
    }, [token, user?.id]);

    const sendMessage = async () => {
        if (!input.trim() || !selectedCompanion) return;

        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setError("");
        setLoading(true);

        try {
            const response = await api.chat({ companionId: selectedCompanion._id, message: userMsg }, token);
            setMessages((prev) => [...prev, { role: "assistant", content: response.reply || response.message || "..." }]);
        } catch (err) {
            setError(err.message || "Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    const handleCompanionSelect = (companion) => {
        selectCompanion(companion._id);
        setMessages([]);
    };

    const handleCompanionCreate = (savedCompanion) => {
        const exists = companions.some((c) => c._id === savedCompanion._id);
        const updated = exists
            ? companions.map((c) => (c._id === savedCompanion._id ? savedCompanion : c))
            : [...companions, savedCompanion];
        setCompanions(updated);
        cacheCompanions(updated);
        selectCompanion(savedCompanion._id);
        setMessages([]);
        setEditingCompanion(null);
    };

    const handleDeleteCompanion = async (companionId) => {
        try {
            await api.deleteCompanion(companionId, token);
            const updated = companions.filter((c) => c._id !== companionId);
            setCompanions(updated);
            cacheCompanions(updated);
            if (selectedCompanionId === companionId && updated[0]) {
                selectCompanion(updated[0]._id);
                setMessages([]);
            }
        } catch (err) {
            setError("Failed to delete companion");
        }
    };

    const getCompanionEmoji = (companion, index) => {
        const fallback = ["😎", "🥳", "🤖", "🧠", "🎯", "🎮"];
        return companion.avatar || fallback[index % fallback.length];
    };

    const isImageAvatar = (avatarValue) => {
        if (!avatarValue || typeof avatarValue !== "string") {
            return false;
        }
        return avatarValue.startsWith("http://") || avatarValue.startsWith("https://") || avatarValue.startsWith("data:image");
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.section}>
                <FlatList
                    horizontal
                    data={companions}
                    keyExtractor={(c) => c._id}
                    renderItem={({ item, index }) => (
                        <View style={styles.avatarItem}>
                            <Pressable
                                style={[styles.quickCompanion, selectedCompanion?._id === item._id && styles.quickCompanionActive]}
                                onPress={() => handleCompanionSelect(item)}
                                onLongPress={() => {
                                    setEditingCompanion(item);
                                    setMakerModalVisible(true);
                                }}
                            >
                                {isImageAvatar(getCompanionEmoji(item, index)) ? (
                                    <Image source={{ uri: getCompanionEmoji(item, index) }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarEmoji}>{getCompanionEmoji(item, index)}</Text>
                                )}
                            </Pressable>
                            <Text style={styles.quickCompanionLabel} numberOfLines={1}>{item.name}</Text>

                            <Pressable
                                style={styles.menuBtn}
                                onPress={() => setOpenMenuId((prev) => (prev === item._id ? null : item._id))}
                            >
                                <Text style={styles.menuText}>⋯</Text>
                            </Pressable>

                            {openMenuId === item._id ? (
                                <View style={styles.menuPanel}>
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setOpenMenuId(null);
                                            setEditingCompanion(item);
                                            setMakerModalVisible(true);
                                        }}
                                    >
                                        <Text style={styles.menuItemText}>Edit</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setOpenMenuId(null);
                                            handleDeleteCompanion(item._id);
                                        }}
                                    >
                                        <Text style={[styles.menuItemText, styles.menuDeleteText]}>Delete</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                    )}
                    ListFooterComponent={(
                        <View style={styles.avatarItem}>
                            <Pressable
                                style={styles.addAvatarBtn}
                                onPress={() => {
                                    setEditingCompanion(null);
                                    setMakerModalVisible(true);
                                }}
                            >
                                <Text style={styles.addAvatarText}>+</Text>
                            </Pressable>
                        </View>
                    )}
                    scrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.companionRow}
                />
            </View>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <View style={styles.companionMetaCard}>
                <Text style={styles.companionMetaTitle}>{selectedCompanion?.name || "Companion"}</Text>
                <Text style={styles.companionMetaText}>{buildCompanionDescription(selectedCompanion)}</Text>
            </View>

            {/* Chat Interface */}
            <View style={styles.chatSection}>
                <View style={styles.messageList}>
                    {!selectedCompanion ? (
                        <Text style={styles.placeholderText}>
                            No companion selected. Tap + to add or choose a companion above.
                        </Text>
                    ) : messages.length === 0 ? (
                        <Text style={styles.placeholderText}>
                            Start chatting with {selectedCompanion.name}...
                        </Text>
                    ) : (
                        <FlatList
                            data={messages}
                            keyExtractor={(_, i) => i.toString()}
                            renderItem={({ item }) => (
                                <View style={[styles.messageBubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                                    <Text style={styles.messageText}>{item.content}</Text>
                                </View>
                            )}
                            scrollEnabled={false}
                        />
                    )}
                </View>

                {showEmojiRow && (
                    <View style={styles.emojiRow}>
                        {QUICK_EMOJIS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                style={styles.emojiBtn}
                                onPress={() => setInput((prev) => prev + emoji)}
                            >
                                <Text>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.inputRow}>
                    <Pressable
                        style={styles.smallBtn}
                        onPress={() => setShowEmojiRow(!showEmojiRow)}
                    >
                        <Text style={styles.smallBtnText}>😊</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.smallBtn, voiceEnabled && styles.voiceActive]}
                        onPress={() => setVoiceEnabled(!voiceEnabled)}
                    >
                        <Text style={styles.smallBtnText}>🎤</Text>
                    </Pressable>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline={false}
                        returnKeyType="send"
                        blurOnSubmit
                        onSubmitEditing={sendMessage}
                    />
                    <Pressable
                        style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.6 }]}
                        onPress={sendMessage}
                        disabled={!selectedCompanion || !input.trim() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.buttonText} size="small" />
                        ) : (
                            <Text style={styles.sendText}>Send</Text>
                        )}
                    </Pressable>
                </View>
            </View>

            <CompanionMakerModal
                visible={makerModalVisible}
                onClose={() => {
                    setMakerModalVisible(false);
                    setEditingCompanion(null);
                    setOpenMenuId(null);
                }}
                onCreate={handleCompanionCreate}
                existingCompanion={editingCompanion}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 100, backgroundColor: colors.primary, flexGrow: 1 },
    section: { paddingHorizontal: 12, paddingVertical: 10 },
    companionRow: { gap: 14, paddingHorizontal: 2 },
    empty: { color: colors.textMuted, marginBottom: 8, fontSize: 12 },
    avatarItem: { alignItems: "center", minWidth: 64, maxWidth: 82 },
    quickCompanion: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.secondary, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    quickCompanionActive: { borderColor: colors.accent, backgroundColor: colors.tertiary },
    avatarEmoji: { fontSize: 24 },
    avatarImage: { width: 52, height: 52, borderRadius: 26 },
    quickCompanionLabel: { color: colors.textSecondary, fontWeight: "700", fontSize: 11, marginTop: 6, textAlign: "center" },
    addAvatarBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    addAvatarText: { color: colors.buttonText, fontWeight: "900", fontSize: 30, lineHeight: 32 },
    menuBtn: { position: "absolute", top: -4, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    menuText: { color: colors.textSecondary, fontSize: 13, fontWeight: "900", lineHeight: 14 },
    menuPanel: { position: "absolute", top: 22, right: -6, zIndex: 50, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, borderRadius: 10, minWidth: 92, overflow: "hidden" },
    menuItem: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    menuItemText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
    menuDeleteText: { color: colors.error },
    companionMetaCard: { marginHorizontal: 12, marginTop: 4, marginBottom: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 10 },
    companionMetaTitle: { color: colors.text, fontWeight: "800", fontSize: 13 },
    companionMetaText: { color: colors.textMuted, marginTop: 4, lineHeight: 18, fontSize: 12 },
    chatSection: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, minHeight: 430, marginTop: "auto" },
    messageList: { flex: 1, marginBottom: 8, backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10 },
    messageBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, maxWidth: "85%" },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.accent },
    aiBubble: { alignSelf: "flex-start", backgroundColor: colors.tertiary },
    messageText: { color: colors.text, fontSize: 13 },
    placeholderText: { color: colors.textMuted, marginTop: 20 },
    error: { color: colors.error, marginBottom: 8, fontSize: 12 },
    errorBanner: { color: colors.error, marginHorizontal: 12, marginTop: -4, marginBottom: 8, fontSize: 12, fontWeight: "700" },
    emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8, padding: 6, backgroundColor: colors.secondary, borderRadius: 10 },
    emojiBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    inputRow: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
    smallBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    voiceActive: { borderColor: colors.accent, backgroundColor: colors.tertiary },
    smallBtnText: { fontSize: 18 },
    input: { flex: 1, backgroundColor: colors.inputBg, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 100 },
    sendBtn: { height: 38, borderRadius: 10, backgroundColor: colors.accent, justifyContent: "center", paddingHorizontal: 12 },
    sendText: { color: colors.buttonText, fontWeight: "800", fontSize: 12 }
});
