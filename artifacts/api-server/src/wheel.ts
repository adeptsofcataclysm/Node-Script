import { type Server, type Socket } from "socket.io";
import { logger } from "./lib/logger";

const SEGMENTS = [
  "ВАЙП",
  "-100",
  "СВАП",
  "+100",
  "Рассказать стишок",
  "-500",
  "ДЖЕКПОТ",
  "-300",
  "+500",
  "ДЕРЖИ ВОРА",
  "+300",
];

const NUM_SEGMENTS = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
const SPIN_DURATION_MS = 5200;

interface WheelState {
  isSpinning: boolean;
  lastSegmentIndex: number;
  totalRotation: number;
  previousTotalRotation: number;
  spinStartTime: number | null;
  spinTargetRotation: number;
  spinDurationMs: number;
}

export function setupWheel(io: Server) {
  const wheelNs = io.of("/wheel");
  const state: WheelState = {
    isSpinning: false,
    lastSegmentIndex: 0,
    totalRotation: 0,
    previousTotalRotation: 0,
    spinStartTime: null,
    spinTargetRotation: 0,
    spinDurationMs: SPIN_DURATION_MS,
  };

  // Track which socket is the host (first non-viewer connection)
  let hostSocketId: string | null = null;

  wheelNs.on("connection", (socket: Socket) => {
    const isViewer = socket.handshake.query.viewer === "1";
    logger.info({ socketId: socket.id, isViewer }, "Wheel connection");

    // Send current state to the newly connected client
    socket.emit("wheelSync", {
      isSpinning: state.isSpinning,
      lastSegmentIndex: state.lastSegmentIndex,
      totalRotation: state.totalRotation,
      previousTotalRotation: state.previousTotalRotation,
      spinStartTime: state.spinStartTime,
      spinTargetRotation: state.spinTargetRotation,
      spinDurationMs: state.spinDurationMs,
    });

    if (!isViewer) {
      // First non-viewer becomes the host
      if (!hostSocketId) hostSocketId = socket.id;

      socket.on("wheelSpin", () => {
        // Only the designated host can spin
        if (socket.id !== hostSocketId) return;
        if (state.isSpinning) return;

        state.isSpinning = true;

        const segmentIndex = Math.floor(Math.random() * NUM_SEGMENTS);
        // Pointer is at 90° (right/3 o'clock). After CSS rotate(θ), segment i
        // originally at segCenterAngle appears at (segCenterAngle + θ) mod 360.
        // We need (segCenterAngle + θ) ≡ 90 (mod 360), so:
        const segCenterAngle = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
        const currentMod = ((state.totalRotation % 360) + 360) % 360;
        const adjustment = ((90 - segCenterAngle - currentMod) % 360 + 360) % 360;
        const fullSpins = 5 + Math.floor(Math.random() * 4);
        const targetRotation = state.totalRotation + fullSpins * 360 + adjustment;

        state.previousTotalRotation = state.totalRotation;
        state.totalRotation = targetRotation;
        state.lastSegmentIndex = segmentIndex;
        state.spinStartTime = Date.now();
        state.spinTargetRotation = targetRotation;
        state.spinDurationMs = SPIN_DURATION_MS;

        wheelNs.emit("wheelSpinStart", {
          targetRotation,
          durationMs: SPIN_DURATION_MS,
          segmentIndex,
        });

        setTimeout(() => {
          state.isSpinning = false;
          state.spinStartTime = null;
          wheelNs.emit("wheelResult", {
            segmentIndex,
            label: SEGMENTS[segmentIndex],
          });
        }, SPIN_DURATION_MS + 200);
      });

      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id }, "Wheel host disconnected");
        if (hostSocketId === socket.id) hostSocketId = null;
      });
    } else {
      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id }, "Wheel viewer disconnected");
      });
    }
  });
}
