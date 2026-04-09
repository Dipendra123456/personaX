import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const AUTH_KEY = "personax-mobile-auth";

export const useAppStore = create((set, get) => ({
    token: "",
    user: null,
    companions: [],
    selectedCompanionId: null,
    hydrated: false,

    hydrateAuth: async () => {
        try {
            const raw = await AsyncStorage.getItem(AUTH_KEY);
            const parsed = raw ? JSON.parse(raw) : { token: "", user: null };
            set({ token: parsed.token || "", user: parsed.user || null, hydrated: true });
        } catch {
            set({ token: "", user: null, hydrated: true });
        }
    },

    setAuth: async ({ token, user }) => {
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
        set({ token, user });
    },

    setUser: async (user) => {
        const token = get().token;
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
        set({ user });
    },

    clearAuth: async () => {
        await AsyncStorage.removeItem(AUTH_KEY);
        set({ token: "", user: null, companions: [], selectedCompanionId: null });
    },

    setCompanions: (companions) =>
        set((state) => ({
            companions,
            selectedCompanionId: state.selectedCompanionId || companions[0]?._id || null
        })),

    selectCompanion: (selectedCompanionId) => set({ selectedCompanionId }),

    selectedCompanion: () => {
        const { companions, selectedCompanionId } = get();
        return companions.find((item) => item._id === selectedCompanionId) || null;
    }
}));
