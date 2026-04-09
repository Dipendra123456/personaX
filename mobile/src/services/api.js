import { NativeModules, Platform } from "react-native";

const getDevHostFromBundleUrl = () => {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || "";
    const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
    return match?.[1] || "";
};

const resolveApiBase = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    const devHost = getDevHostFromBundleUrl();
    if (devHost) {
        return `http://${devHost}:5000/api`;
    }

    if (Platform.OS === "android") {
        return "http://10.0.2.2:5000/api";
    }

    return "http://localhost:5000/api";
};

const API_BASE = resolveApiBase();

const request = async (path, { method = "GET", body, token } = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(payload.message || "Request failed");
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export const api = {
    register: (payload) => request("/auth/register", { method: "POST", body: payload }),
    login: (payload) => request("/auth/login", { method: "POST", body: payload }),
    me: (token) => request("/auth/me", { token }),
    updateProfile: (payload, token) => request("/auth/me", { method: "PUT", body: payload, token }),
    listCompanions: (token) => request("/companions", { token }),
    createCompanion: (payload, token) => request("/companions", { method: "POST", body: payload, token }),
    updateCompanion: (id, payload, token) => request(`/companions/${id}`, { method: "PUT", body: payload, token }),
    deleteCompanion: (id, token) => request(`/companions/${id}`, { method: "DELETE", token }),
    generateAvatar: (id, token) => request(`/avatar/${id}/generate`, { method: "POST", token }),
    chat: (payload, token) => request("/chat", { method: "POST", body: payload, token }),
    improve: (payload, token) => request("/improve", { method: "POST", body: payload, token }),
    startGame: (payload, token) => request("/game/start", { method: "POST", body: payload, token }),
    moveGame: (payload, token) => request("/game/move", { method: "POST", body: payload, token }),
    getSocialRooms: (params = {}, token) => {
        const type = params.type || "";
        const limit = params.limit || 20;
        const page = params.page || 1;
        return request(`/social/rooms?type=${type}&limit=${limit}&page=${page}`, { token });
    },
    createSocialRoom: (payload, token) => request("/social/rooms", { method: "POST", body: payload, token }),
    joinSocialRoom: (roomId, token) => request(`/social/rooms/${roomId}/join`, { method: "POST", token }),
    leaveSocialRoom: (roomId, token) => request(`/social/rooms/${roomId}/leave`, { method: "POST", token }),
    getSocialPreferences: (token) => request("/social/preferences", { token }),
    updateSocialPreferences: (payload, token) => request("/social/preferences", { method: "POST", body: payload, token }),
    joinSocialQueue: (payload, token) => request("/social/queue/join", { method: "POST", body: payload, token }),
    leaveSocialQueue: (token) => request("/social/queue/leave", { method: "POST", token }),
    getSocialQueueStatus: (token) => request("/social/queue/status", { token }),
    getSocialFriends: (token) => request("/social/friends", { token }),
    getSocialPendingRequests: (token) => request("/social/friends/pending", { token }),
    sendSocialFriendRequest: (userId, token) => request(`/social/friends/${userId}/add`, { method: "POST", token }),
    acceptSocialFriendRequest: (userId, token) => request(`/social/friends/${userId}/accept`, { method: "POST", token }),
    blockSocialUser: (userId, reason, token) => request(`/social/users/${userId}/block`, { method: "POST", body: { reason }, token }),
    reportSocialUser: (userId, reason, token) => request(`/social/users/${userId}/report`, { method: "POST", body: { reason }, token }),
    voiceChat: async (audioBlob, companionId, token, options = {}) => {
        const formData = new FormData();
        const mimeType = audioBlob?.type || "audio/webm";
        const extension = mimeType.includes("webm")
            ? "webm"
            : mimeType.includes("mp4")
                ? "m4a"
                : mimeType.includes("mpeg")
                    ? "mp3"
                    : mimeType.includes("wav")
                        ? "wav"
                        : "bin";
        formData.append("audio", audioBlob, `audio.${extension}`);
        formData.append("companionId", companionId);
        formData.append("liveTranscript", options.liveTranscript || "");
        formData.append("speechLanguage", options.speechLanguage || "");

        const response = await fetch(`${API_BASE}/audio/voice-chat`, {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: formData
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({ message: "Voice chat failed" }));
            throw new Error(errorPayload.message || "Voice chat failed");
        }

        return response.json();
    }
};
