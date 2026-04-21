import { useState } from "react";

export function AdminPage() {
  const base = window.location.origin;
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyUrl(href: string, key: string) {
    navigator.clipboard.writeText(href).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  const links = [
    {
      group: "Колесо Адептов",
      color: "#f1c40f",
      glow: "rgba(241,196,15,0.25)",
      border: "#f1c40f",
      items: [
        { label: "Счастливчик", desc: "управление колесом", href: `${base}/` },
        { label: "Зрители", desc: "наблюдение за колесом", href: `${base}/watch` },
      ],
    },
    {
      group: "Ящик Пандоры",
      color: "#c39bd3",
      glow: "rgba(155,89,182,0.25)",
      border: "#9b59b6",
      items: [
        { label: "Игроки", desc: "участники рулетки", href: `${base}/game` },
        { label: "Наблюдатель", desc: "зрительный режим", href: `${base}/spectate` },
      ],
    },
  ];

  async function handleResetRoulette() {
    if (resetStatus === "loading") return;
    setResetStatus("loading");
    try {
      const res = await fetch("/api/admin/reset-roulette", { method: "POST" });
      if (res.ok) {
        setResetStatus("done");
        setTimeout(() => setResetStatus("idle"), 3000);
      } else {
        setResetStatus("error");
        setTimeout(() => setResetStatus("idle"), 3000);
      }
    } catch {
      setResetStatus("error");
      setTimeout(() => setResetStatus("idle"), 3000);
    }
  }

  const resetLabel = {
    idle: "↺  Закрыть ящик пандоры",
    loading: "Сброс...",
    done: "✓  Сброшено",
    error: "✗  Ошибка",
  }[resetStatus];

  const resetColor = {
    idle: "#e74c3c",
    loading: "#e67e22",
    done: "#2ecc71",
    error: "#e74c3c",
  }[resetStatus];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a1a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "monospace",
      padding: "40px 20px",
      position: "relative",
    }}>

      {/* Background subtle grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(155,89,182,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(155,89,182,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Refresh button — top right */}
      <button
        onClick={() => window.location.reload()}
        title="Обновить страницу"
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 30,
          padding: "7px 18px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.7)",
          fontSize: 11, letterSpacing: "3px", textTransform: "uppercase",
          cursor: "pointer", borderRadius: 4,
        }}
      >
        ↺ Обновить
      </button>

      {/* Title */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 48, textAlign: "center" }}>
        <img
          src="/adepts-logo.png"
          alt="Adepts Games"
          style={{
            width: "clamp(80px, 10vw, 130px)",
            height: "auto",
            marginBottom: 18,
            borderRadius: 16,
            boxShadow: "0 0 30px rgba(155,89,182,0.5), 0 0 60px rgba(155,89,182,0.2)",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
        <div style={{
          fontSize: 10, letterSpacing: "6px", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", marginBottom: 10,
        }}>
          Adepts Games
        </div>
        <h1 style={{
          fontSize: "clamp(22px, 3vw, 36px)", fontWeight: "bold",
          textTransform: "uppercase", letterSpacing: "10px",
          color: "#fff",
          textShadow: "0 0 30px rgba(155,89,182,0.6), 0 0 60px rgba(155,89,182,0.3)",
          margin: 0,
        }}>
          Панель Администратора
        </h1>
      </div>

      {/* Link groups */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", gap: 36,
        width: "100%", maxWidth: 560,
      }}>
        {links.map((group) => (
          <div key={group.group}>
            {/* Group header */}
            <div style={{
              fontSize: 10, letterSpacing: "5px", textTransform: "uppercase",
              color: group.color, marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${group.border}33`,
              textShadow: `0 0 10px ${group.glow}`,
            }}>
              {group.group}
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.items.map((item) => {
                const isCopied = copiedKey === item.label;
                return (
                  <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Main link row */}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 20px",
                        border: `1px solid ${group.border}55`,
                        borderBottom: "none",
                        background: `linear-gradient(90deg, ${group.glow} 0%, rgba(0,0,0,0.4) 100%)`,
                        borderRadius: "6px 6px 0 0",
                        textDecoration: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = group.border;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = `${group.border}55`;
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>
                          {item.desc}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>
                        открыть →
                      </span>
                    </a>

                    {/* Copy URL row */}
                    <button
                      onClick={() => copyUrl(item.href, item.label)}
                      title="Скопировать ссылку"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 20px",
                        border: `1px solid ${group.border}33`,
                        background: "rgba(0,0,0,0.45)",
                        borderRadius: "0 0 6px 6px",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: 12,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.45)";
                      }}
                    >
                      <span style={{
                        fontSize: 11, color: isCopied ? "#2ecc71" : group.color,
                        letterSpacing: "0.5px", opacity: 0.85,
                        wordBreak: "break-all", textAlign: "left", flex: 1,
                        transition: "color 0.2s",
                      }}>
                        {item.href}
                      </span>
                      <span style={{
                        fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
                        color: isCopied ? "#2ecc71" : "rgba(255,255,255,0.35)",
                        flexShrink: 0, minWidth: 72,
                        transition: "color 0.2s",
                      }}>
                        {isCopied ? "✓ скопировано" : "⎘ копировать"}
                      </span>
                    </button>
                  </div>
                );
              })}

              {/* Reset button — only under Ящик Пандоры */}
              {group.group === "Ящик Пандоры" && (
                <button
                  onClick={handleResetRoulette}
                  disabled={resetStatus === "loading"}
                  style={{
                    marginTop: 4,
                    padding: "12px 20px",
                    border: `1px solid ${resetColor}66`,
                    background: `rgba(0,0,0,0.5)`,
                    borderRadius: 6,
                    color: resetColor,
                    fontSize: 12, letterSpacing: "3px", textTransform: "uppercase",
                    cursor: resetStatus === "loading" ? "not-allowed" : "pointer",
                    textAlign: "center",
                    transition: "border-color 0.3s, color 0.3s, box-shadow 0.3s",
                    boxShadow: resetStatus === "done" ? "0 0 20px rgba(46,204,113,0.3)" : resetStatus === "error" ? "0 0 20px rgba(231,76,60,0.3)" : "none",
                    width: "100%",
                  }}
                >
                  {resetLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
