export function AdminPage() {
  const base = window.location.origin;

  const links = [
    {
      group: "Колесо Адептов",
      color: "#f1c40f",
      glow: "rgba(241,196,15,0.25)",
      border: "#f1c40f",
      items: [
        { label: "Ведущий", desc: "управление колесом", href: `${base}/` },
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
        <div style={{
          fontSize: 10, letterSpacing: "6px", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", marginBottom: 10,
        }}>
          Pandora Games
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
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px",
                    border: `1px solid ${group.border}55`,
                    background: `linear-gradient(90deg, ${group.glow} 0%, rgba(0,0,0,0.4) 100%)`,
                    borderRadius: 6,
                    textDecoration: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: `0 0 0px ${group.glow}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = group.border;
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 16px ${group.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = `${group.border}55`;
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 0px ${group.glow}`;
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, color: group.color, letterSpacing: "1px", opacity: 0.8 }}>
                      {item.href.replace(base, "")}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
                      открыть →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Admin URL hint at bottom */}
      <div style={{
        position: "relative", zIndex: 1,
        marginTop: 48,
        fontSize: 10, color: "rgba(255,255,255,0.2)",
        letterSpacing: "2px", textAlign: "center",
      }}>
        {base}/admin
      </div>
    </div>
  );
}
