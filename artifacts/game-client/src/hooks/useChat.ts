import { useState, useEffect, useCallback } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "./quizNavSocket";

export interface ChatMessage {
  id: string;
  nick: string;
  role: "host" | "spectator";
  text: string;
}

const SESSION_KEY = "quiz_chat_messages";

function readSession(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeSession(msgs: ChatMessage[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs));
  } catch { /* ignore */ }
}

// Module-level cache initialized from sessionStorage so it survives
// both React unmount/remount AND full-page navigations (window.location.replace).
let cachedMessages: ChatMessage[] = readSession();

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(cachedMessages);
  const [text, setText] = useState("");

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const socket = getQuizNavSocket();

      const onHistory = (history: ChatMessage[]) => {
        cachedMessages = history;
        writeSession(cachedMessages);
        setMessages([...cachedMessages]);
      };

      const onMessage = (msg: ChatMessage) => {
        if (cachedMessages.some((m) => m.id === msg.id)) return;
        cachedMessages = [...cachedMessages, msg];
        writeSession(cachedMessages);
        setMessages([...cachedMessages]);
      };

      socket.on("chatHistory", onHistory);
      socket.on("chatMessage", onMessage);
      socket.emit("requestChatHistory");

      detach = () => {
        socket.off("chatHistory", onHistory);
        socket.off("chatMessage", onMessage);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  const sendMessage = useCallback((msgText: string) => {
    const trimmed = msgText.trim();
    if (!trimmed) return;
    const nick = localStorage.getItem("player_nick") || "Аноним";
    const roleRaw = localStorage.getItem("player_role")?.trim().toLowerCase();
    const role = roleRaw === "host" ? "host" : "spectator";
    getQuizNavSocket().emit("chatMessage", { nick, role, text: trimmed });
  }, []);

  return { messages, text, setText, sendMessage };
}
