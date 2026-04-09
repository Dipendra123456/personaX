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

export const socialApi = {
    // ==================== ROOM ENDPOINTS ====================
    createRoom: (payload, token) =>
        request("/social/rooms", { method: "POST", body: payload, token }),

    getRooms: (type, limit = 20, page = 1, token) =>
        request(`/social/rooms?type=${type || ""}&limit=${limit}&page=${page}`, { token }),

    getRoomDetails: (roomId, token) =>
        request(`/social/rooms/${roomId}`, { token }),

    joinRoom: (roomId, token) =>
        request(`/social/rooms/${roomId}/join`, { method: "POST", token }),

    leaveRoom: (roomId, token) =>
        request(`/social/rooms/${roomId}/leave`, { method: "POST", token }),

    // ==================== QUEUE ENDPOINTS ====================
    joinMatchQueue: (payload, token) =>
        request("/social/queue/join", { method: "POST", body: payload, token }),

    leaveMatchQueue: (token) =>
        request("/social/queue/leave", { method: "POST", token }),

    getQueueStatus: (token) =>
        request("/social/queue/status", { token }),

    // ==================== FRIEND ENDPOINTS ====================
    sendFriendRequest: (userId, token) =>
        request(`/social/friends/${userId}/add`, { method: "POST", token }),

    acceptFriendRequest: (userId, token) =>
        request(`/social/friends/${userId}/accept`, { method: "POST", token }),

    getFriends: (token) =>
        request("/social/friends", { token }),

    getPendingRequests: (token) =>
        request("/social/friends/pending", { token }),

    blockUser: (userId, reason = "", token) =>
        request(`/social/users/${userId}/block`, { method: "POST", body: { reason }, token }),

    reportUser: (userId, reason = "", token) =>
        request(`/social/users/${userId}/report`, { method: "POST", body: { reason }, token }),

    getBlockedUsers: (token) =>
        request("/social/users/blocked", { token }),

    // ==================== PREFERENCE ENDPOINTS ====================
    getUserPreferences: (token) =>
        request("/social/preferences", { token }),

    updateUserPreferences: (payload, token) =>
        request("/social/preferences", { method: "POST", body: payload, token })
};
