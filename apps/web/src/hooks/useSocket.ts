import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function useSocket(
  event: string,
  handler: (...args: unknown[]) => void,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    const wrapped = (...args: unknown[]) => handlerRef.current(...args);
    s.on(event, wrapped);
    return () => {
      s.off(event, wrapped);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export function joinChat(chatId: string) {
  getSocket().emit("join_chat", chatId);
}

export function leaveChatRoom(chatId: string) {
  getSocket().emit("leave_chat", chatId);
}

export function emitTyping(chatId: string, isTyping: boolean) {
  getSocket().emit("typing", { chatId, isTyping });
}
