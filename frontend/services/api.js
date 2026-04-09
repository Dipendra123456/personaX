const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
        const errorPayload = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(errorPayload.message || "Request failed");
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
    listCompanions: (token) => request("/companions", { token }),
    createCompanion: (payload, token) => request("/companions", { method: "POST", body: payload, token }),
    updateCompanion: (id, payload, token) => request(`/companions/${id}`, { method: "PUT", body: payload, token }),
    deleteCompanion: (id, token) => request(`/companions/${id}`, { method: "DELETE", token }),
    chat: (payload, token) => request("/chat", { method: "POST", body: payload, token }),
    chatHistory: (companionId, token) => request(`/chat/${companionId}/history`, { token }),
    improve: (payload, token) => request("/improve", { method: "POST", body: payload, token }),
    generateAvatar: (id, token) => request(`/avatar/${id}/generate`, { method: "POST", token }),
    startGame: (payload, token) => request("/game/start", { method: "POST", body: payload, token }),
    moveGame: (payload, token) => request("/game/move", { method: "POST", body: payload, token }),
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
    },
    generateSpeech: (text, token) => request("/audio/speak", { method: "POST", body: { text }, token })
};
