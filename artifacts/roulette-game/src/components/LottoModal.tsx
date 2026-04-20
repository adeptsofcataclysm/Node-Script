import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";

const BALL_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#27ae60",
  "#3498db", "#8e44ad", "#16a085", "#c0392b",
  "#d35400", "#2980b9", "#7d3c98", "#1e8449",
];

const BALL_ORBIT = 100;
const BALL_SIZE = 46;

function PandoraBtn({
  onClick,
  disabled,
  children,
  accent = "#f1c40f",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 font-mono text-xs uppercase tracking-[2px] transition-all duration-150"
      style={{
        background: "transparent",
        border: `1px solid ${disabled ? "#333" : accent}`,
        color: disabled ? "#333" : accent,
        cursor: disabled ? "not-allowed" : "pointer",
        textShadow: disabled ? "none" : `0 0 8px ${accent}88`,
        boxShadow: disabled ? "none" : `0 0 12px ${accent}22`,
      }}
    >
      {children}
    </button>
  );
}

export function LottoModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [phase, setPhase] = useState<"setup" | "drum">("setup");
  const [nameInput, setNameInput] = useState("");
  const [names, setNames] = useState<string[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);

  const rotate = useMotionValue(0);
  const absRot = useRef(0);
  const rafRef = useRef<number>(0);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const audio = new Audio("/lotto-music.mp3");
      audio.loop = true;
      audio.volume = 0.45;
      audio.play().catch(() => {});
      musicRef.current = audio;
    } catch (_) {}
    return () => {
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isSpinning) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      absRot.current += 150 * dt;
      rotate.set(absRot.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isSpinning, rotate]);

  const addName = () => {
    const t = nameInput.trim();
    if (!t || names.includes(t) || names.length >= 12) return;
    setNames(prev => [...prev, t]);
    setNameInput("");
  };

  const startDrum = () => {
    absRot.current = 0;
    rotate.set(0);
    setPhase("drum");
    setIsSpinning(true);
    setRevealed(false);
    setChosenIdx(null);
  };

  const stopDrum = () => setIsSpinning(false);

  const revealChoice = () => {
    if (isSpinning || revealed) return;
    setChosenIdx(Math.floor(Math.random() * names.length));
    setRevealed(true);
  };

  const respin = () => {
    setRevealed(false);
    setChosenIdx(null);
    absRot.current = 0;
    rotate.set(0);
    setIsSpinning(true);
  };

  const confirmChoice = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onConfirm();
  };

  const closeModal = () => {
    if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    onClose();
  };

  const n = names.length;
  const chosenName = chosenIdx !== null ? names[chosenIdx] : null;
  const chosenColor = chosenIdx !== null ? BALL_COLORS[chosenIdx % BALL_COLORS.length] : "#f1c40f";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "setup" ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-5 w-full max-w-sm"
          >
            <h2
              className="text-3xl font-bold uppercase tracking-[4px] text-center"
              style={{ color: "#f1c40f", textShadow: "0 0 24px rgba(241,196,15,0.5)" }}
            >
              Барабан Лото
            </h2>
            <p className="text-xs font-mono uppercase tracking-[3px] text-center" style={{ color: "#555" }}>
              Добавьте участников (мин. 2, макс. 12)
            </p>

            <form
              className="flex gap-2 w-full"
              onSubmit={(e) => { e.preventDefault(); addName(); }}
            >
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={16}
                placeholder="Имя участника"
                className="flex-1 px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid #f1c40f44",
                  color: "white",
                }}
              />
              <button
                type="submit"
                className="px-4 py-2 font-mono text-lg font-bold"
                style={{
                  background: "transparent",
                  border: "1px solid #f1c40f",
                  color: "#f1c40f",
                  cursor: "pointer",
                  textShadow: "0 0 8px #f1c40f",
                }}
              >
                +
              </button>
            </form>

            <div className="flex flex-col gap-1.5 w-full max-h-52 overflow-y-auto pr-1">
              {names.map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between px-3 py-2 font-mono text-sm uppercase"
                  style={{
                    border: `1px solid ${BALL_COLORS[i % BALL_COLORS.length]}44`,
                    color: BALL_COLORS[i % BALL_COLORS.length],
                    background: `${BALL_COLORS[i % BALL_COLORS.length]}11`,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: BALL_COLORS[i % BALL_COLORS.length],
                        color: "white",
                        fontSize: 11,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    {name}
                  </span>
                  <button
                    onClick={() => setNames(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
                  >
                    ×
                  </button>
                </motion.div>
              ))}
              {names.length === 0 && (
                <p className="text-center font-mono text-xs py-4" style={{ color: "#333" }}>
                  Список пуст
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <PandoraBtn onClick={closeModal} accent="#555">
                Отмена
              </PandoraBtn>
              <PandoraBtn onClick={startDrum} disabled={names.length < 2} accent="#f1c40f">
                Запустить барабан
              </PandoraBtn>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="drum"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5"
          >
            <h2
              className="text-2xl font-bold uppercase tracking-[4px]"
              style={{ color: "#f1c40f", textShadow: "0 0 24px rgba(241,196,15,0.5)" }}
            >
              Барабан Лото
            </h2>

            {/* Drum */}
            <div className="relative flex items-center justify-center" style={{ width: 310, height: 310 }}>
              <div
                className="absolute rounded-full"
                style={{
                  width: 306,
                  height: 306,
                  border: "3px solid #f1c40f",
                  boxShadow:
                    "0 0 50px rgba(241,196,15,0.35), 0 0 100px rgba(241,196,15,0.1), inset 0 0 70px rgba(0,0,0,0.8)",
                  background:
                    "radial-gradient(ellipse at center, rgba(30,15,0,0.85) 0%, rgba(0,0,0,0.96) 75%)",
                }}
              />

              <svg
                className="absolute"
                width={296}
                height={296}
                style={{ zIndex: 5, opacity: 0.12 }}
              >
                <line x1="148" y1="0" x2="148" y2="296" stroke="#f1c40f" strokeWidth="1" />
                <line x1="0" y1="148" x2="296" y2="148" stroke="#f1c40f" strokeWidth="1" />
                <line x1="42" y1="42" x2="254" y2="254" stroke="#f1c40f" strokeWidth="1" />
                <line x1="254" y1="42" x2="42" y2="254" stroke="#f1c40f" strokeWidth="1" />
                <ellipse cx="148" cy="148" rx="148" ry="52" fill="none" stroke="#f1c40f" strokeWidth="1" />
                <ellipse cx="148" cy="148" rx="52" ry="148" fill="none" stroke="#f1c40f" strokeWidth="1" />
              </svg>

              <motion.div
                className="absolute"
                style={{ width: 270, height: 270, rotate, zIndex: 10 }}
              >
                {names.map((_, i) => {
                  const angle = (i / n) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const x = Math.sin(rad) * BALL_ORBIT + 135 - BALL_SIZE / 2;
                  const y = -Math.cos(rad) * BALL_ORBIT + 135 - BALL_SIZE / 2;
                  const color = BALL_COLORS[i % BALL_COLORS.length];
                  return (
                    <div
                      key={i}
                      className="absolute rounded-full flex items-center justify-center"
                      style={{
                        width: BALL_SIZE,
                        height: BALL_SIZE,
                        left: x,
                        top: y,
                        background: `radial-gradient(circle at 35% 30%, ${color}ff, ${color}88)`,
                        boxShadow: `0 0 14px ${color}99, inset 0 4px 10px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.45)`,
                        color: "white",
                        fontSize: 15,
                        fontWeight: 900,
                        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                      }}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </motion.div>

              <div
                className="absolute z-20 rounded-full flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  background: "#0a0a0a",
                  border: "2px solid #f1c40f",
                  color: "#f1c40f",
                  fontSize: 10,
                  fontFamily: "monospace",
                  letterSpacing: "1px",
                  textAlign: "center",
                  boxShadow: "0 0 12px rgba(241,196,15,0.3)",
                }}
              >
                ЛОТО
              </div>
            </div>

            <AnimatePresence>
              {!revealed ? (
                <motion.div
                  key="controls"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3"
                >
                  <PandoraBtn onClick={stopDrum} disabled={!isSpinning} accent="#e74c3c">
                    Остановить барабан
                  </PandoraBtn>
                  <PandoraBtn onClick={revealChoice} disabled={isSpinning} accent="#f1c40f">
                    Озвучить выбор
                  </PandoraBtn>
                </motion.div>
              ) : (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 130,
                      height: 130,
                      background: `radial-gradient(circle at 35% 30%, ${chosenColor}ff, ${chosenColor}88)`,
                      boxShadow: `0 0 60px ${chosenColor}88, 0 0 120px ${chosenColor}33, inset 0 8px 24px rgba(255,255,255,0.55), inset 0 -8px 16px rgba(0,0,0,0.45)`,
                      color: "white",
                      fontSize: 28,
                      fontWeight: 900,
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    }}
                  >
                    {(chosenIdx ?? 0) + 1}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <p className="font-mono text-xs uppercase tracking-[4px]" style={{ color: "#666" }}>
                      Счастливчик
                    </p>
                    <p
                      className="text-4xl font-bold uppercase tracking-[3px]"
                      style={{ color: chosenColor, textShadow: `0 0 30px ${chosenColor}` }}
                    >
                      {chosenName}
                    </p>
                  </motion.div>

                  <div className="flex gap-3 mt-1">
                    <PandoraBtn onClick={respin} accent="#555">
                      Перекрутить
                    </PandoraBtn>
                    <PandoraBtn onClick={confirmChoice} accent={chosenColor}>
                      Подтвердить замену
                    </PandoraBtn>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!revealed && (
              <button
                onClick={() => { setPhase("setup"); setIsSpinning(false); cancelAnimationFrame(rafRef.current); }}
                className="font-mono text-xs uppercase tracking-[2px] mt-1"
                style={{ background: "none", border: "none", color: "#333", cursor: "pointer" }}
              >
                ← Назад к списку
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
