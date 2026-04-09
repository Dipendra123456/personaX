import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors } from "../constants/colors";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function SocializeScreen() {
    const token = useAppStore((s) => s.token);
    const user = useAppStore((s) => s.user);
    const [roomCode, setRoomCode] = useState("");
    const [roomTypeFilter, setRoomTypeFilter] = useState("all");
    const [rooms, setRooms] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [isQueueing, setIsQueueing] = useState(false);
    const [queueInfo, setQueueInfo] = useState(null);
    const [showActiveRooms, setShowActiveRooms] = useState(false);
    const [viewMode, setViewMode] = useState("lobby"); // lobby | matchmaking | room
    const [activeRoom, setActiveRoom] = useState(null);
    const [anonymousProfile, setAnonymousProfile] = useState(true);
    const [aiCompanionEnabled, setAiCompanionEnabled] = useState(true);
    const [goGlobal, setGoGlobal] = useState(false);
    const [friendUserIdInput, setFriendUserIdInput] = useState("");
    const [safetyTargetUserId, setSafetyTargetUserId] = useState("");
    const [safetyReason, setSafetyReason] = useState("Inappropriate behavior");

    const canUseApi = useMemo(() => Boolean(token), [token]);
    const selectedRoomType = roomTypeFilter === "all" ? "chat" : roomTypeFilter;

    const loadRooms = async (selectedFilter = roomTypeFilter) => {
        if (!canUseApi) return;

        const roomResult = await api.getSocialRooms(
            selectedFilter === "all" ? {} : { type: selectedFilter },
            token
        );
        setRooms(roomResult?.rooms || []);
    };

    const loadSocialData = async () => {
        if (!canUseApi) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const [prefs, queue, friendsResult, pendingResult] = await Promise.all([
                api.getSocialPreferences(token),
                api.getSocialQueueStatus(token),
                api.getSocialFriends(token),
                api.getSocialPendingRequests(token)
            ]);

            const identity = prefs?.identity || "anonymous";
            const isAnonymous = identity === "anonymous";
            setAnonymousProfile(isAnonymous);
            setAiCompanionEnabled(Boolean(prefs?.aiCompanionAllowed ?? true));
            setGoGlobal(Boolean(prefs?.goGlobalMatchmaking ?? false));

            setQueueInfo(queue || null);
            if (queue?.status === "waiting") {
                setViewMode("matchmaking");
            }
            setFriends(friendsResult || []);
            setPendingRequests(pendingResult || []);
            await loadRooms(roomTypeFilter);
        } catch (err) {
            setError(err.message || "Failed to load socialize data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSocialData();
    }, [canUseApi, token]);

    useEffect(() => {
        if (!canUseApi) return;
        loadRooms(roomTypeFilter).catch((err) => setError(err.message || "Failed to load rooms"));
    }, [roomTypeFilter, canUseApi]);

    useEffect(() => {
        if (!canUseApi || viewMode !== "matchmaking") return;

        const interval = setInterval(async () => {
            try {
                const queue = await api.getSocialQueueStatus(token);
                setQueueInfo(queue || null);

                if (queue?.status === "matched" && queue?.matchedRoomId) {
                    setActiveRoom({
                        id: queue.matchedRoomId,
                        title: "Matched Room",
                        type: queue.type || selectedRoomType
                    });
                    setStatus("Match found. Connected to room.");
                    setViewMode("room");
                }
            } catch {
                // Keep polling lightweight and silent.
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [canUseApi, viewMode, token, selectedRoomType]);

    const persistPreferences = async (updates) => {
        if (!canUseApi) return;

        try {
            setIsSavingPrefs(true);
            setError("");
            await api.updateSocialPreferences(updates, token);
        } catch (err) {
            setError(err.message || "Failed to save preferences");
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const handleAnonymousToggle = async (value) => {
        setAnonymousProfile(value);
        const identity = value ? "anonymous" : "profile";
        await persistPreferences({ identity });
    };

    const handleCreateRoom = async () => {
        if (!canUseApi) return;

        try {
            setIsCreatingRoom(true);
            setError("");
            const type = selectedRoomType;
            const payload = {
                title: `${type.charAt(0).toUpperCase()}${type.slice(1)} Room`,
                type,
                aiCompanionId: aiCompanionEnabled ? "mobile-ai" : undefined
            };

            const response = await api.createSocialRoom(payload, token);
            const createdRoomId = response?.room?._id;

            if (createdRoomId) {
                setRoomCode(createdRoomId);
                setStatus(`Room created: ${createdRoomId}`);
                setActiveRoom({
                    id: createdRoomId,
                    title: response?.room?.title || "Created Room",
                    type: response?.room?.type || selectedRoomType
                });
                setViewMode("room");
                await loadRooms(roomTypeFilter);
            }
        } catch (err) {
            setError(err.message || "Failed to create room");
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!canUseApi) return;

        const roomId = roomCode.trim();
        if (!roomId) {
            setError("Enter a valid room id first");
            return;
        }

        try {
            setIsJoiningRoom(true);
            setError("");
            await api.joinSocialRoom(roomId, token);
            setStatus(`Joined room: ${roomId}`);
            const selectedRoom = rooms.find((room) => room.id === roomId);
            setActiveRoom({
                id: roomId,
                title: selectedRoom?.title || "Joined Room",
                type: selectedRoom?.type || selectedRoomType
            });
            setViewMode("room");
        } catch (err) {
            setError(err.message || "Failed to join room");
        } finally {
            setIsJoiningRoom(false);
        }
    };

    const handleQuickMatch = async () => {
        if (!canUseApi) return;

        try {
            setIsQueueing(true);
            setError("");
            const type = selectedRoomType;
            const result = await api.joinSocialQueue({ type }, token);
            setQueueInfo({ status: "waiting", type, position: result?.position });
            setStatus("Quick match started. Waiting for a partner...");
            setViewMode("matchmaking");
        } catch (err) {
            setError(err.message || "Failed to start quick match");
        } finally {
            setIsQueueing(false);
        }
    };

    const handleCancelQuickMatch = async () => {
        if (!canUseApi) return;

        try {
            await api.leaveSocialQueue(token);
            setQueueInfo(null);
            setStatus("Quick match cancelled");
            setViewMode("lobby");
        } catch (err) {
            setError(err.message || "Failed to cancel quick match");
        }
    };

    const handleLeaveRoom = async () => {
        if (!canUseApi || !activeRoom?.id) {
            setViewMode("lobby");
            setActiveRoom(null);
            return;
        }

        try {
            await api.leaveSocialRoom(activeRoom.id, token);
        } catch {
            // Keep UX resilient even if room leave API fails.
        } finally {
            setActiveRoom(null);
            setViewMode("lobby");
            await loadRooms(roomTypeFilter);
        }
    };

    const handleSendFriendRequest = async () => {
        if (!canUseApi) return;

        const targetId = friendUserIdInput.trim();
        if (!targetId) {
            setError("Enter user id to send request");
            return;
        }

        try {
            setError("");
            await api.sendSocialFriendRequest(targetId, token);
            setFriendUserIdInput("");
            setStatus("Friend request sent");
            const pending = await api.getSocialPendingRequests(token);
            setPendingRequests(pending || []);
        } catch (err) {
            setError(err.message || "Failed to send friend request");
        }
    };

    const handleAcceptFriendRequest = async (fromUserId) => {
        if (!canUseApi || !fromUserId) return;

        try {
            setError("");
            await api.acceptSocialFriendRequest(fromUserId, token);
            setStatus("Friend request accepted");

            const [friendsResult, pendingResult] = await Promise.all([
                api.getSocialFriends(token),
                api.getSocialPendingRequests(token)
            ]);
            setFriends(friendsResult || []);
            setPendingRequests(pendingResult || []);
        } catch (err) {
            setError(err.message || "Failed to accept request");
        }
    };

    const handleSafetyAction = async (type) => {
        if (!canUseApi) return;

        const targetId = safetyTargetUserId.trim();
        if (!targetId) {
            setError("Enter target user id first");
            return;
        }

        try {
            setError("");
            if (type === "block") {
                await api.blockSocialUser(targetId, safetyReason, token);
                setStatus("User blocked");
            } else {
                await api.reportSocialUser(targetId, safetyReason, token);
                setStatus("User reported");
            }
        } catch (err) {
            setError(err.message || "Safety action failed");
        }
    };

    if (viewMode === "matchmaking") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <View style={styles.headerCard}>
                    <Text style={styles.sectionLabel}>Rooms</Text>
                    <Text style={styles.title}>Finding a partner...</Text>
                    <Text style={styles.subtitle}>We are matching you with a stranger based on your selected room type.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Quick Match</Text>
                    <Text style={styles.cardText}>Status: {queueInfo?.status || "waiting"}</Text>
                    <Text style={styles.cardText}>Type: {(queueInfo?.type || selectedRoomType).toUpperCase()}</Text>
                    {queueInfo?.position ? <Text style={styles.cardText}>Position: {queueInfo.position}</Text> : null}

                    <View style={styles.matchRow}>
                        <Pressable style={[styles.secondaryBtn, styles.matchBtn]} onPress={handleCancelQuickMatch}>
                            <Text style={styles.secondaryText}>Cancel Match</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        );
    }

    if (viewMode === "room") {
        return (
            <ScrollView contentContainerStyle={styles.wrap}>
                <View style={styles.headerCard}>
                    <Text style={styles.sectionLabel}>Rooms</Text>
                    <Text style={styles.title}>{activeRoom?.title || "Connected Room"}</Text>
                    <Text style={styles.subtitle}>You are now connected. Chat/voice/video controls can be extended here next.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Room Details</Text>
                    <Text style={styles.cardText}>Room Id: {activeRoom?.id || "-"}</Text>
                    <Text style={styles.cardText}>Type: {(activeRoom?.type || selectedRoomType).toUpperCase()}</Text>

                    <View style={styles.matchRow}>
                        <Pressable style={[styles.secondaryBtn, styles.matchBtn]} onPress={handleLeaveRoom}>
                            <Text style={styles.secondaryText}>Leave Room</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Rooms</Text>
                <Text style={styles.title}>Find Your People. Start Talking</Text>
            </View>

            {!canUseApi ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>Log in first to use live social features.</Text>
                </View>
            ) : null}

            {isLoading ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.cardText}>Loading social data...</Text>
                </View>
            ) : null}

            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            {status ? (
                <View style={styles.statusCard}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            ) : null}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Rooms</Text>
                <View style={[styles.rowGrid, styles.roomsFilterRow]}>
                    {["all", "chat", "voice", "video"].map((item) => (
                        <Pressable
                            key={item}
                            style={[styles.choiceBtn, roomTypeFilter === item && styles.choiceBtnActive]}
                            onPress={() => setRoomTypeFilter(item)}
                        >
                            <Text style={styles.choiceText}>{item.toUpperCase()}</Text>
                        </Pressable>
                    ))}
                </View>
                <TextInput value={roomCode} onChangeText={setRoomCode} placeholder="Room code" placeholderTextColor="#7f9792" style={styles.input} />
                <View style={styles.actionRow}>
                    <Pressable style={[styles.primaryBtn, isJoiningRoom && styles.disabledBtn]} onPress={handleJoinRoom} disabled={isJoiningRoom || !canUseApi}>
                        <Text style={styles.primaryText}>{isJoiningRoom ? "Joining..." : "Join Room"}</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryBtn, isCreatingRoom && styles.disabledBtn]} onPress={handleCreateRoom} disabled={isCreatingRoom || !canUseApi}>
                        <Text style={styles.secondaryText}>{isCreatingRoom ? "Creating..." : "Create Room"}</Text>
                    </Pressable>
                </View>

                <View style={styles.matchRow}>
                    <Pressable style={[styles.secondaryBtn, styles.matchBtn, isQueueing && styles.disabledBtn]} onPress={handleQuickMatch} disabled={isQueueing || !canUseApi}>
                        <Text style={styles.secondaryText}>{isQueueing ? "Starting..." : "Quick Match"}</Text>
                    </Pressable>
                </View>

                <View style={styles.roomsListWrap}>
                    <Pressable style={styles.roomsHeaderBtn} onPress={() => setShowActiveRooms((prev) => !prev)}>
                        <Text style={styles.roomsLabel}>Active Rooms ({rooms.length})</Text>
                        <Text style={styles.roomsToggleText}>{showActiveRooms ? "Hide" : "Show"}</Text>
                    </Pressable>

                    {showActiveRooms ? (
                        rooms.length === 0 ? (
                            <Text style={styles.cardText}>No active rooms yet.</Text>
                        ) : (
                            rooms.slice(0, 6).map((room) => (
                                <Pressable key={room.id} style={styles.roomListItem} onPress={() => setRoomCode(room.id)}>
                                    <Text style={styles.roomListTitle}>{room.title}</Text>
                                    <Text style={styles.roomListMeta}>{room.type} | {room.userCount} users</Text>
                                </Pressable>
                            ))
                        )
                    ) : null}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Friends & Following</Text>
                <View style={styles.friendInputRow}>
                    <TextInput
                        value={friendUserIdInput}
                        onChangeText={setFriendUserIdInput}
                        placeholder="User id to add"
                        placeholderTextColor="#7f9792"
                        style={[styles.input, styles.friendInput]}
                    />
                    <Pressable style={styles.primaryBtn} onPress={handleSendFriendRequest}>
                        <Text style={styles.primaryText}>Add</Text>
                    </Pressable>
                </View>

                {pendingRequests.length > 0 ? (
                    <View style={styles.subSection}>
                        <Text style={styles.roomsLabel}>Pending Requests</Text>
                        {pendingRequests.map((req) => (
                            <View key={req.id} style={styles.listItemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roomListTitle}>{req.from?.name || "Unknown"}</Text>
                                    <Text style={styles.roomListMeta}>{req.from?.email || "No email"}</Text>
                                </View>
                                <Pressable style={styles.secondaryBtn} onPress={() => handleAcceptFriendRequest(req.from?._id || req.from?.id)}>
                                    <Text style={styles.secondaryText}>Accept</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View style={styles.subSection}>
                    <Text style={styles.roomsLabel}>Friends</Text>
                    {friends.length === 0 ? (
                        <Text style={styles.cardText}>No friends added yet.</Text>
                    ) : (
                        friends.slice(0, 8).map((friend) => (
                            <View key={friend.id} style={styles.listItemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roomListTitle}>{friend.friend?.name || "Unknown"}</Text>
                                    <Text style={styles.roomListMeta}>{friend.friend?.email || "No email"}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Public Options</Text>
                <SettingRow label="Anonymous profile toggle" value={anonymousProfile} onChange={handleAnonymousToggle} />
                <SettingRow
                    label="AI Companion"
                    value={aiCompanionEnabled}
                    onChange={(value) => {
                        setAiCompanionEnabled(value);
                        persistPreferences({ aiCompanionAllowed: value });
                    }}
                />
                <SettingRow
                    label="Go Global"
                    value={goGlobal}
                    onChange={(value) => {
                        setGoGlobal(value);
                        persistPreferences({ goGlobalMatchmaking: value });
                    }}
                />
                {isSavingPrefs ? <Text style={styles.metaInfo}>Saving preferences...</Text> : null}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Safety</Text>
                <TextInput
                    value={safetyTargetUserId}
                    onChangeText={setSafetyTargetUserId}
                    placeholder="Target user id"
                    placeholderTextColor="#7f9792"
                    style={styles.input}
                />
                <TextInput
                    value={safetyReason}
                    onChangeText={setSafetyReason}
                    placeholder="Reason"
                    placeholderTextColor="#7f9792"
                    style={styles.input}
                />
                <View style={styles.safetyActions}>
                    <Pressable style={styles.secondaryBtn} onPress={() => handleSafetyAction("block")}>
                        <Text style={styles.secondaryText}>Block User</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={() => handleSafetyAction("report")}>
                        <Text style={styles.secondaryText}>Report User</Text>
                    </Pressable>
                </View>
            </View>

        </ScrollView>
    );
}

function SettingRow({ label, value, onChange }) {
    return (
        <View style={styles.settingRow}>
            <Text style={styles.cardText}>{label}</Text>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: "#2a413d", true: "#39df7f" }} thumbColor="#f4fffc" />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 32 },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    errorCard: { backgroundColor: colors.errorBg, borderRadius: 12, borderWidth: 1, borderColor: colors.error, padding: 10, marginBottom: 12 },
    errorText: { color: colors.error, fontWeight: "700" },
    statusCard: { backgroundColor: colors.tertiary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 12 },
    statusText: { color: colors.textSecondary, fontWeight: "700" },
    headerCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    sectionLabel: { color: colors.accent, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "900" },
    title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
    subtitle: { color: colors.textMuted, marginTop: 6 },
    card: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: 10 },
    cardText: { color: colors.textMuted },
    rowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roomsFilterRow: { marginBottom: 12 },
    choiceBtn: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 10 },
    choiceBtnActive: { backgroundColor: colors.tertiary, borderColor: colors.accent },
    choiceText: { color: colors.textSecondary, fontWeight: "800" },
    input: { backgroundColor: colors.inputBg, color: colors.text, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    actionRow: { flexDirection: "row", gap: 10 },
    matchRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    matchBtn: { flex: 1 },
    friendInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    friendInput: { flex: 1, marginBottom: 0 },
    subSection: { marginTop: 12, gap: 8 },
    listItemRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.inputBg },
    primaryBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    secondaryBtn: { flex: 1, backgroundColor: colors.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: "center" },
    disabledBtn: { opacity: 0.6 },
    primaryText: { color: colors.buttonText, fontWeight: "900" },
    secondaryText: { color: colors.textSecondary, fontWeight: "900" },
    roomsListWrap: { marginTop: 12, gap: 8 },
    roomsHeaderBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
    roomsLabel: { color: colors.textSecondary, fontWeight: "800" },
    roomsToggleText: { color: colors.accent, fontWeight: "700", fontSize: 12 },
    roomListItem: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.inputBg },
    roomListTitle: { color: colors.text, fontWeight: "700" },
    roomListMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    metaInfo: { marginTop: 8, color: colors.textMuted, fontSize: 12 },
    settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    safetyActions: { marginTop: 10, flexDirection: "row", gap: 10 }
});
