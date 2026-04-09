import { useEffect, useMemo } from "react";
import { getSocket } from "../services/socket";

export const useSocket = (roomId, onChat) => {
    const socket = useMemo(() => getSocket(), []);

    useEffect(() => {
        if (!roomId) {
            return;
        }

        socket.emit("joinRoom", roomId);

        const handleChat = (payload) => onChat?.(payload);
        socket.on("chat", handleChat);

        return () => {
            socket.off("chat", handleChat);
        };
    }, [socket, roomId, onChat]);

    return socket;
};
