import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

interface SendMessage {
  (event: string, data: unknown): void;
}

export const useSocket = (room: string | null = null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_SOCKET_URL
        : "http://localhost:3003",
      {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      }
    );

    // Connection event handlers
    socketInstance.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log("Connected to server");

      // Join room if specified
      if (room) {
        socketInstance.emit("join-room", room);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("Disconnected from server:", reason);

      // Attempt reconnection for certain disconnect reasons
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          socketInstance.connect();
        }, 5000);
      }
    });

    socketInstance.on("connect_error", (error: any) => {
      setConnectionError(error.message);
      setIsConnected(false);
      console.error("Connection error:", error);
    });

    setSocket(socketInstance);

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [room]);

  const sendMessage: SendMessage = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn("Socket not connected");
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    sendMessage,
  };
};
