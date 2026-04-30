import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const OK_TEXT = "★  Ладно, заходи!";
const FAIL_TEXT = "✖  Иди нахуй отсюда!";

function OkAnimation() {
  return (
    <motion.div
      style={{ display: "flex", justifyContent: "center", gap: 0, overflow: "visible" }}
    >
      {OK_TEXT.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -40, scale: 1.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: i * 0.06,
            type: "spring",
            stiffness: 280,
            damping: 14,
          }}
          style={{
            display: "inline-block",
            color: "#2ecc71",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "clamp(18px, 3vw, 26px)",
            textShadow: "0 0 16px #2ecc71, 0 0 32px rgba(46,204,113,0.6)",
            whiteSpace: "pre",
          }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.div>
  );
}

function FailAnimation() {
  const shakeX = [0, -14, 18, -22, 16, -10, 20, -16, 8, -6, 0];
  const shakeY = [0, 4, -4, 3, -5, 4, -3, 5, -2, 3, 0];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -8 }}
      animate={{
        scale: [0, 1.35, 1],
        rotate: [-8, 4, 0],
        x: shakeX,
        y: shakeY,
      }}
      transition={{
        scale: { duration: 0.25, times: [0, 0.5, 1] },
        rotate: { duration: 0.25 },
        x: { delay: 0.3, duration: 0.9, ease: "easeOut" },
        y: { delay: 0.3, duration: 0.9, ease: "easeOut" },
      }}
      style={{ display: "flex", justifyContent: "center", overflow: "visible" }}
    >
      {FAIL_TEXT.split("").map((ch, i) => (
        <motion.span
          key={i}
          animate={{
            opacity: [1, 0.3, 1, 0.6, 1],
            color: ["#e74c3c", "#ff6b6b", "#e74c3c", "#c0392b", "#e74c3c"],
          }}
          transition={{
            delay: 0.25 + i * 0.03,
            duration: 0.4,
            repeat: 2,
            repeatType: "reverse",
          }}
          style={{
            display: "inline-block",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "clamp(18px, 3vw, 26px)",
            textShadow: "0 0 16px #e74c3c, 0 0 32px rgba(231,76,60,0.7)",
            whiteSpace: "pre",
          }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.div>
  );
}

export function AdminGuard() {
  const [nick, setNick] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const nickRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nickVal = nick.trim();
    const passVal = input.trim();
    if (!nickVal || !passVal) return;

    if (passVal.toLowerCase() === "да") {
      setStatus("ok");
      setTimeout(() => {
        localStorage.setItem("player_nick", nickVal);
        localStorage.setItem("player_role", "host");
        window.location.href = `${base}/adepts-game/`;
      }, 2600);
    } else {
      setStatus("fail");
      setTimeout(() => {
        setStatus("idle");
        setInput("");
        inputRef.current?.focus();
      }, 2600);
    }
  }

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
          ref={nickRef}
          value={nick}
          onChange={e => setNick(e.target.value)}
          disabled={status !== "idle"}
          autoFocus
          placeholder="Введите свой ник"
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
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== "idle"}
          type="password"
          placeholder="Введи пароль..."
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

      {/* Animated response */}
      <div style={{ marginTop: 40, height: 48, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", width: "100%" }}>
        <AnimatePresence mode="wait">
          {status === "ok" && <OkAnimation key="ok" />}
          {status === "fail" && <FailAnimation key="fail" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
