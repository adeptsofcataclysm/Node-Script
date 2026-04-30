import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import { useChat } from "@/hooks/useChat";

const SPECTATOR_COLORS = [
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#f472b6",
  "#60a5fa",
  "#f87171",
  "#2dd4bf",
  "#c084fc",
  "#4ade80",
  "#e879f9",
];

const HOST_COLOR = "#facc15";
const HOST_FONT_SIZE = 15;
const SPECTATOR_FONT_SIZE = 13;

const EMOJIS = [
  "🦝","😀","😅","😂","🤣","🥰","😘","🤩",
  "🥳","🤯","🥶","🤓","😎","😱","🤑","😻",
  "🙀","😽","👍","👎","🤟","👌","🫶","🖕",
  "🫵","🏆","🎁","🪙","💰","🪅","🎊","🎉",
  "❤️","💖","❤️‍🔥","🔥",
];

function getNickColor(nick: string, role: "host" | "spectator"): string {
  if (role === "host") return HOST_COLOR;
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = ((hash << 5) - hash) + nick.charCodeAt(i);
    hash |= 0;
  }
  return SPECTATOR_COLORS[Math.abs(hash) % SPECTATOR_COLORS.length];
}

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className = "" }: ChatPanelProps) {
  const { messages, text, setText, sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    sendMessage(text);
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    // restore cursor after the inserted emoji
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-fuchsia-500/70 bg-card/80 shadow-[0_0_18px_hsla(300,90%,55%,0.28)] backdrop-blur-sm ${className}`}
      style={{ minWidth: 0 }}
    >
      <div className="flex-shrink-0 border-b border-fuchsia-500/30 px-4 py-2.5">
        <h2 className="font-display text-xs tracking-widest text-primary/70 uppercase">
          Чат зрителей
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:hsla(300,90%,55%,0.5)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fuchsia-500/50 [&::-webkit-scrollbar-thumb:hover]:bg-fuchsia-500/80">
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{ fontSize: msg.role === "host" ? HOST_FONT_SIZE : SPECTATOR_FONT_SIZE }}
          >
            <span style={{ color: getNickColor(msg.nick, msg.role), fontWeight: 600 }}>
              {msg.nick}:
            </span>{" "}
            <span style={{ color: "rgba(255,255,255,0.88)" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {pickerOpen && (
        <div className="flex-shrink-0 border-t border-fuchsia-500/30 bg-card/90 p-1.5">
          <div className="grid grid-cols-6 gap-0.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="flex items-center justify-center rounded p-1 text-base leading-none transition hover:bg-fuchsia-500/20 active:scale-90"
                style={{ fontSize: 18 }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex items-center gap-1.5 border-t border-fuchsia-500/30 p-2">
        {/* Emoji toggle */}

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Пиши сюдой..."
          className="flex-1 min-w-0 rounded border border-border/60 bg-background/50 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />

<button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          title="Смайлики"
          className={`flex-shrink-0 flex items-center justify-center rounded border px-2 py-1.5 text-base transition ${
            pickerOpen
              ? "border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-300"
              : "border-border/50 bg-background/40 text-foreground/60 hover:border-fuchsia-500/50 hover:text-fuchsia-300"
          }`}
          style={{ fontSize: 16 }}
        >
          🙂
        </button>

        <button
          type="button"
          onClick={handleSend}
          className="flex-shrink-0 rounded border border-primary/40 bg-primary/15 px-3 py-1.5 text-sm text-primary transition hover:bg-primary/25"
        >
          {'>'}
        </button>
      </div>
    </div>
  );
}
