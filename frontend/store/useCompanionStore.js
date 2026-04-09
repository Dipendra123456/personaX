import { create } from "zustand";

const readStoredAuth = () => {
    if (typeof window === "undefined") {
        return { token: "", user: null };
    }

    try {
        const raw = window.localStorage.getItem("personax-auth");
        return raw ? JSON.parse(raw) : { token: "", user: null };
    } catch {
        return { token: "", user: null };
    }
};

export const useCompanionStore = create((set) => ({
    // ==================== AUTH SLICE ====================
    companions: [],
    selectedCompanionId: null,
    token: "",
    user: null,
    hasHydrated: false,
    hydrateAuth: () => {
        const stored = readStoredAuth();
        set({ ...stored, hasHydrated: true });
    },
    setAuth: ({ token, user }) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("personax-auth", JSON.stringify({ token, user }));
        }

        set({ token, user, hasHydrated: true });
    },
    clearAuth: () => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("personax-auth");
        }

        set({ token: "", user: null, companions: [], selectedCompanionId: null, hasHydrated: true });
    },
    setCompanions: (companions) =>
        set((state) => ({
            companions,
            selectedCompanionId: state.selectedCompanionId || companions[0]?._id || null
        })),
    selectCompanion: (id) => set({ selectedCompanionId: id }),

    // ==================== LIVE/SOCIAL SLICE ====================
    liveState: {
        currentRoom: null,
        roomsList: [],
        queueStatus: null,
        friends: [],
        pendingRequests: [],
        userPreferences: {
            identity: "profile",
            selectedCompanionId: null,
            voiceChatEnabled: true,
            strangerChatEnabled: true,
            teamMatchmaking: false,
            aiCompanionAllowed: true
        },
        matchedUser: null,
        blockedUsers: [],
        isSearchingMatch: false
    },

    setCurrentRoom: (room) =>
        set((state) => ({
            liveState: { ...state.liveState, currentRoom: room }
        })),

    setRoomsList: (roomsList) =>
        set((state) => ({
            liveState: { ...state.liveState, roomsList }
        })),

    setQueueStatus: (queueStatus) =>
        set((state) => ({
            liveState: { ...state.liveState, queueStatus }
        })),

    updateFriendsList: (friends) =>
        set((state) => ({
            liveState: { ...state.liveState, friends }
        })),

    updatePendingRequests: (pendingRequests) =>
        set((state) => ({
            liveState: { ...state.liveState, pendingRequests }
        })),

    setUserPreferences: (preferences) =>
        set((state) => ({
            liveState: {
                ...state.liveState,
                userPreferences: { ...state.liveState.userPreferences, ...preferences }
            }
        })),

    setMatchedUser: (matchedUser) =>
        set((state) => ({
            liveState: { ...state.liveState, matchedUser }
        })),

    setIsSearchingMatch: (isSearching) =>
        set((state) => ({
            liveState: { ...state.liveState, isSearchingMatch: isSearching }
        })),

    addBlockedUser: (userId) =>
        set((state) => ({
            liveState: {
                ...state.liveState,
                blockedUsers: [...state.liveState.blockedUsers, userId]
            }
        })),

    removeBlockedUser: (userId) =>
        set((state) => ({
            liveState: {
                ...state.liveState,
                blockedUsers: state.liveState.blockedUsers.filter(id => id !== userId)
            }
        })),

    clearLiveState: () =>
        set((state) => ({
            liveState: {
                ...state.liveState,
                currentRoom: null,
                matchedUser: null,
                queueStatus: null,
                isSearchingMatch: false
            }
        }))
}));
