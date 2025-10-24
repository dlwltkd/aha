import { useEffect, useRef, useState } from "react";

type MessageHandler<T> = (data: T) => void;

export function useWebSocket<T = unknown>(url: string | undefined, onMessage?: MessageHandler<T>) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setConnected] = useState(false);

  useEffect(() => {
    if (!url) {
      return;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;

    const handleOpen = () => setConnected(true);
    const handleClose = () => setConnected(false);
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as T;
        onMessage?.(data);
      } catch (error) {
        console.warn("Failed to parse WebSocket message", error);
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("message", handleMessage);
      socket.close();
    };
  }, [url, onMessage]);

  return {
    isConnected
  };
}
