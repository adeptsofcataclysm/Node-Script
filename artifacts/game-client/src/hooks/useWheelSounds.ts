import { useEffect, useRef } from "react";
import type { WheelResultData } from "./useWheelSocket";

const BASE = "/wsounds/";

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

function stopAudio(a: HTMLAudioElement | null) {
  if (!a) return;
  try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
}

function playOnce(file: string, volume: number): HTMLAudioElement | null {
  try {
    const a = new Audio(BASE + file);
    a.volume = volume;
    a.play().catch(() => {});
    return a;
  } catch { return null; }
}

export function useWheelSounds(isSpinning: boolean, result: WheelResultData | null) {
  const spinRef   = useRef<HTMLAudioElement | null>(null);
  const resultRef = useRef<HTMLAudioElement | null>(null);

  // Spin sound — looped while spinning
  useEffect(() => {
    if (isSpinning) {
      const a = new Audio(BASE + "spin.mp3");
      a.loop = true;
      a.volume = 0.4;
      a.play().catch(() => {});
      spinRef.current = a;
    } else {
      stopAudio(spinRef.current);
      spinRef.current = null;
    }
    return () => {
      stopAudio(spinRef.current);
      spinRef.current = null;
    };
  }, [isSpinning]);

  // Result sound — play on arrive, stop on dismiss (result → null)
  useEffect(() => {
    if (!result) {
      stopAudio(resultRef.current);
      resultRef.current = null;
      return;
    }
    stopAudio(resultRef.current);
    const label = result.label.trim();
    const entry = SEGMENT_SOUNDS[result.label] ?? SEGMENT_SOUNDS[label];
    if (entry) {
      resultRef.current = playOnce(entry.file, entry.volume);
    }
    return () => {
      stopAudio(resultRef.current);
      resultRef.current = null;
    };
  }, [result]);

  // Mallet interaction sounds (Host only)
  const playMalletGrab  = () => playOnce("armGrab.mp3", 0.4);
  const playMalletSwing = () => {
    playOnce("armDown.mp3", 1.0);
    playOnce("click.mp3",   0.5);
  };

  return { playMalletGrab, playMalletSwing };
}
