import { useState, useEffect, useCallback } from "react";
import { getQuizNavSocket } from "./quizNavSocket";

export interface ChatMessage {
  id: string;
  nick: string;
  role: "host" | "spectator";
  text: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const socket = getQuizNavSocket();

    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chatMessage", onMessage);
    return () => {
      socket.off("chatMessage", onMessage);
    };
  }, []);

  const sendMessage = useCallback((msgText: string) => {
    const trimmed = msgText.trim();
    if (!trimmed) return;
    const nick = localStorage.getItem("player_nick") || "Аноним";
    const roleRaw = localStorage.getItem("player_role");
    const role = roleRaw === "host" ? "host" : "spectator";
    getQuizNavSocket().emit("chatMessage", { nick, role, text: trimmed });
  }, []);

  return { messages, text, setText, sendMessage };
}
