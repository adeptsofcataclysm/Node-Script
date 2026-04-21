import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface WheelSpinData {
  targetRotation: number;
  durationMs: number;
  segmentIndex: number;
}

export interface WheelResultData {
  segmentIndex: number;
  label: string;
}

export function useWheelSocket(isViewer: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinData, setSpinData] = useState<WheelSpinData | null>(null);
  const [result, setResult] = useState<WheelResultData | null>(null);
  const [initialRotation, setInitialRotation] = useState(0);

  useEffect(() => {
    const query = isViewer ? { viewer: "1" } : {};
    const s = io("/wheel", { path: "/socket.io", query });
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("wheelSync", (data: {
      isSpinning: boolean;
      lastSegmentIndex: number;
      totalRotation: number;
      previousTotalRotation: number;
      spinStartTime: number | null;
      spinTargetRotation: number;
      spinDurationMs: number;
    }) => {
      setIsSpinning(data.isSpinning);

      if (data.isSpinning && data.spinStartTime !== null) {
        // Mid-spin join: reconstruct remaining animation
        const elapsed = Date.now() - data.spinStartTime;
        const remaining = data.spinDurationMs - elapsed;
        if (remaining > 300) {
          // Start from pre-spin position, animate to target over remaining time
          setInitialRotation(data.previousTotalRotation);
          setSpinData({
            targetRotation: data.spinTargetRotation,
            durationMs: remaining,
            segmentIndex: data.lastSegmentIndex,
          });
        } else {
          // Nearly done — jump to final position instantly
          setInitialRotation(data.spinTargetRotation);
        }
      } else {
        // Not spinning — sync wheel to last known resting position
        if (data.totalRotation !== 0) {
          setInitialRotation(data.totalRotation);
        }
      }
    });

    s.on("wheelSpinStart", (data: WheelSpinData) => {
      setIsSpinning(true);
      setResult(null);
      setSpinData(data);
    });

    s.on("wheelResult", (data: WheelResultData) => {
      setIsSpinning(false);
      setResult(data);
    });

    return () => {
      s.disconnect();
    };
  }, [isViewer]);

  const spin = useCallback(() => {
    if (socketRef.current && !isSpinning) {
      socketRef.current.emit("wheelSpin");
    }
  }, [isSpinning]);

  const dismissResult = useCallback(() => {
    setResult(null);
  }, []);

  return { connected, isSpinning, spinData, result, initialRotation, spin, dismissResult };
}
