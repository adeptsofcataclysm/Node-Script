import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage } from "./AdminPage";

export function AdminGuard() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [granted, setGranted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;

    if (val.toLowerCase() === "да") {
      setStatus("ok");
      setTimeout(() => setGranted(true), 2400);
    } else {
      setStatus("fail");
      setTimeout(() => {
        setStatus("idle");
        setInput("");
        inputRef.current?.focus();
      }, 2400);
    }
  }

  if (granted) return <AdminPage />;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1a2e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "monospace",
      padding: 24,
    }}>
      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: "clamp(18px, 3.5vw, 32px)",
          fontWeight: 700,
          color: "#f1c40f",
          textShadow: "0 0 18px rgba(241,196,15,0.7)",
          textAlign: "center",
          marginBottom: 36,
          letterSpacing: "1px",
        }}
      >
        Ты чё, блядь, самый умный?
      </motion.div>

      {/* Input form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: 320 }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== "idle"}
          autoFocus
          placeholder="Введи ответ..."
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(241,196,15,0.4)",
            borderRadius: 6,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 16,
            outline: "none",
            textAlign: "center",
            letterSpacing: "2px",
            boxShadow: "0 0 12px rgba(241,196,15,0.1)",
            transition: "border-color 0.2s",
          }}
          onFocus={e => { e.target.style.borderColor = "#f1c40f"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(241,196,15,0.4)"; }}
        />
        <button
          type="submit"
          disabled={status !== "idle"}
          style={{
            padding: "8px 32px",
            background: "transparent",
            border: "1px solid #8e44ad",
            borderRadius: 4,
            color: "#c39bd3",
            fontFamily: "monospace",
            fontSize: 12,
            letterSpacing: "3px",
            textTransform: "uppercase",
            cursor: "pointer",
            opacity: status !== "idle" ? 0.4 : 1,
            transition: "opacity 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(142,68,173,0.6)"; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.boxShadow = "none"; }}
        >
          Ответить
        </button>
      </motion.form>

      {/* Ticker response */}
      <div style={{ marginTop: 32, height: 32, overflow: "hidden", width: "100%", maxWidth: 420 }}>
        <AnimatePresence mode="wait">
          {status === "ok" && (
            <motion.div
              key="ok"
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{ duration: 2.2, ease: "linear" }}
              style={{
                whiteSpace: "nowrap",
                color: "#2ecc71",
                fontSize: 18,
                fontFamily: "monospace",
                fontWeight: 700,
                textShadow: "0 0 12px #2ecc71",
                letterSpacing: "3px",
              }}
            >
              ★ Ладно, заходи! ★ Ладно, заходи! ★ Ладно, заходи! ★
            </motion.div>
          )}
          {status === "fail" && (
            <motion.div
              key="fail"
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{ duration: 2.2, ease: "linear" }}
              style={{
                whiteSpace: "nowrap",
                color: "#e74c3c",
                fontSize: 18,
                fontFamily: "monospace",
                fontWeight: 700,
                textShadow: "0 0 12px #e74c3c",
                letterSpacing: "3px",
              }}
            >
              ✖ Иди нахуй отсюда! ✖ Иди нахуй отсюда! ✖ Иди нахуй отсюда! ✖
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
