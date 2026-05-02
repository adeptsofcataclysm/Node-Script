import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { buildQuizBoardUrl } from "@/lib/adeptsQuizBoardRoute";

/** По `funeralEnd` с `/quiz-nav`: оверлей «Похороны закончены!» и переход на квиз-доску 3. */
export function FuneralEndSync() {
  const [visible, setVisible] = useState(false);
  const navigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();

      const onFuneralEnd = () => {
        if (navigatedRef.current) return;
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (navigatedRef.current) return;
          navigatedRef.current = true;
          window.location.assign(buildQuizBoardUrl(3));
        }, 3000);
      };

      s.on("funeralEnd", onFuneralEnd);
      detach = () => {
        s.off("funeralEnd", onFuneralEnd);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
          aria-label="Похороны закончены"
        >
          <motion.p
            className="max-w-[min(92vw,56rem)] px-6 text-center font-display text-[clamp(2rem,8vw,4.5rem)] font-bold leading-tight tracking-wide text-amber-100"
            style={{
              textShadow:
                "0 0 22px rgba(253, 224, 71, 0.95), 0 0 50px rgba(245, 158, 11, 0.85), 0 0 90px rgba(180, 83, 9, 0.55)",
              filter: "drop-shadow(0 0 32px rgba(250, 204, 21, 0.45))",
            }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: [0.92, 1, 1.02, 1],
              opacity: 1,
            }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Похороны закончены!
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
