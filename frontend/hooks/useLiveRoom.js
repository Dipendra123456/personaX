import { useEffect } from "react";
import { getSocket } from "../services/socket";
import { useCompanionStore } from "../store/useCompanionStore";

export const useLiveRoom = (roomId, userId) => {
    const { setCurrentRoom } = useCompanionStore();
    const socket = getSocket();

    useEffect(() => {
        if (!roomId || !userId) return;

        // Emit user connection
        socket.emit("user:connect", { userId });

        // Join room
        socket.emit("user:joined-room", {
            roomId,
            userId,
            userName: "User", // TODO: Get from store
            identity: "profile" // TODO: Get from preferences
        });

        // Listen to user join events
        const handleUserJoined = (data) => {
            console.log("User joined room:", data);
        };

        // Listen to user leave events
        const handleUserLeft = (data) => {
            console.log("User left room:", data);
        };

        // Listen to room updates
        const handleRoomUpdated = (data) => {
            console.log("Room updated:", data);
            setCurrentRoom(data);
        };

        socket.on("user:joined-room", handleUserJoined);
        socket.on("user:left-room", handleUserLeft);
        socket.on("room:updated", handleRoomUpdated);

        return () => {
            socket.off("user:joined-room", handleUserJoined);
            socket.off("user:left-room", handleUserLeft);
            socket.off("room:updated", handleRoomUpdated);

            // Emit leave
            socket.emit("user:left-room", { roomId, userId });
        };
    }, [roomId, userId, socket, setCurrentRoom]);

    return socket;
};
