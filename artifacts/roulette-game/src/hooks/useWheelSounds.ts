import { useEffect, useRef } from "react";
import type { WheelResultData } from "./useWheelSocket";

const BASE = "/wsounds/";

// Exact mapping from original site (script.js)
const SEGMENT_SOUNDS: Record<string, { file: string; volume: number }> = {
  "Рассказать стишок": { file: "win.mp3",          volume: 0.6 },
  "-500":              { file: "500propil.mp3",     volume: 0.6 },
  "ДЖЕКПОТ":           { file: "jackpot.mp3",       volume: 0.8 },
  "-300":              { file: "300minus.mp3",       volume: 0.15 },
  "+500":              { file: "500plus.mp3",        volume: 0.6 },
  "ДЕРЖИ ВОРА":        { file: "thief.mp3",         volume: 0.5 },
  "+300":              { file: "300plusSound.mp3",   volume: 0.5 },
  "ВАЙП":              { file: "vaip.mp3",           volume: 0.6 },
  "-100":              { file: "100minussound.mp3",  volume: 0.7 },
  "СВАП":              { file: "svapSound.mp3",      volume: 0.9 },
  "+100":              { file: "100plussound.mp3",   volume: 0.7 },
};

function playOnce(file: string, volume: number) {
  try {
    const a = new Audio(BASE + file);
    a.volume = volume;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

function stopAll(audios: (HTMLAudioElement | null)[]) {
  for (const a of audios) {
    if (!a) continue;
    try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
  }
}

export function useWheelSounds(isSpinning: boolean, result: WheelResultData | null) {
  const spinRef = useRef<HTMLAudioElement | null>(null);

  // Spin sound — looped while spinning
  useEffect(() => {
    if (isSpinning) {
      const a = new Audio(BASE + "spin.mp3");
      a.loop = true;
      a.volume = 0.4;
      a.play().catch(() => {});
      spinRef.current = a;
    } else {
      if (spinRef.current) {
        spinRef.current.pause();
        spinRef.current.currentTime = 0;
        spinRef.current = null;
      }
    }
    return () => {
      if (spinRef.current) {
        spinRef.current.pause();
        spinRef.current = null;
      }
    };
  }, [isSpinning]);

  // Result sound
  useEffect(() => {
    if (!result) return;
    // Stop any lingering result sounds
    // Match label (trim trailing space like "+300 ")
    const label = result.label.trim();
    const entry = SEGMENT_SOUNDS[result.label] ?? SEGMENT_SOUNDS[label];
    if (entry) {
      playOnce(entry.file, entry.volume);
    }
  }, [result]);

  // Mallet interaction sounds (Host only)
  const playMalletGrab  = () => playOnce("armGrab.mp3", 0.4);
  const playMalletSwing = () => {
    playOnce("armDown.mp3", 1.0);
    playOnce("click.mp3",   0.5);
  };

  return { playMalletGrab, playMalletSwing };
}
