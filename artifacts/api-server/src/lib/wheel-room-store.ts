export const WHEEL_SEGMENTS = [
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
] as const;

const NUM_SEGMENTS = WHEEL_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
export const WHEEL_SPIN_DURATION_MS = 10400;

export type WheelRoomState = {
  isSpinning: boolean;
  lastSegmentIndex: number;
  totalRotation: number;
  previousTotalRotation: number;
  spinStartTime: number | null;
  spinTargetRotation: number;
  spinDurationMs: number;
};

function initial(): WheelRoomState {
  return {
    isSpinning: false,
    lastSegmentIndex: 0,
    totalRotation: 0,
    previousTotalRotation: 0,
    spinStartTime: null,
    spinTargetRotation: 0,
    spinDurationMs: WHEEL_SPIN_DURATION_MS,
  };
}

const states = new Map<string, WheelRoomState>();

export function getWheelRoomState(sessionId: string): WheelRoomState {
  if (!states.has(sessionId)) states.set(sessionId, initial());
  return states.get(sessionId)!;
}

export function cloneWheelRoomState(sessionId: string): WheelRoomState {
  return structuredClone(getWheelRoomState(sessionId));
}

/** Returns null if already spinning. */
export function startWheelSpin(sessionId: string): {
  segmentIndex: number;
  targetRotation: number;
  durationMs: number;
} | null {
  const st = getWheelRoomState(sessionId);
  if (st.isSpinning) return null;

  st.isSpinning = true;
  const segmentIndex = Math.floor(Math.random() * NUM_SEGMENTS);
  const segCenterAngle = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const currentMod = ((st.totalRotation % 360) + 360) % 360;
  const adjustment = ((90 - segCenterAngle - currentMod) % 360 + 360) % 360;
  const fullSpins = 8 + Math.floor(Math.random() * 6);
  const targetRotation = st.totalRotation + fullSpins * 360 + adjustment;

  st.previousTotalRotation = st.totalRotation;
  st.totalRotation = targetRotation;
  st.lastSegmentIndex = segmentIndex;
  st.spinStartTime = Date.now();
  st.spinTargetRotation = targetRotation;
  st.spinDurationMs = WHEEL_SPIN_DURATION_MS;

  return { segmentIndex, targetRotation, durationMs: WHEEL_SPIN_DURATION_MS };
}

export function endWheelSpin(sessionId: string): void {
  const st = getWheelRoomState(sessionId);
  st.isSpinning = false;
  st.spinStartTime = null;
}
