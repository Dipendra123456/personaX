import { useEffect } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../services/socket";
import { useCompanionStore } from "../store/useCompanionStore";

export const useMatchQueue = (userId) => {
    const router = useRouter();
    const { setMatchedUser, setQueueStatus, setIsSearchingMatch } = useCompanionStore();
    const socket = getSocket();

    useEffect(() => {
        if (!userId) return;

        // Listen for match found
        const handleMatchFound = (data) => {
            console.log("Match found:", data);
            setMatchedUser(data.matchedUser);
            setQueueStatus(null);
            setIsSearchingMatch(false);

            // Keep users inside the existing app shell and pass match context.
            router.push(`/socialize?matchedRoomId=${data.roomId}`);
        };

        // Listen for match expired
        const handleMatchExpired = (data) => {
            console.log("Match expired:", data);
            setQueueStatus(null);
            setIsSearchingMatch(false);
        };

        socket.on("match:found", handleMatchFound);
        socket.on("match:expired", handleMatchExpired);

        return () => {
            socket.off("match:found", handleMatchFound);
            socket.off("match:expired", handleMatchExpired);
        };
    }, [userId, socket, router, setMatchedUser, setQueueStatus, setIsSearchingMatch]);

    return socket;
};
