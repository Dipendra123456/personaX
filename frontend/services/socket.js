import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
    if (socket) {
        return socket;
    }

    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    socket = io(url, { transports: ["websocket"] });
    return socket;
};
