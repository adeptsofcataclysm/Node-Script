import { type Server, type Socket } from "socket.io";
import {
  cloneWheelRoomState,
  endWheelSpin,
  getWheelRoomState,
  startWheelSpin,
  WHEEL_SEGMENTS,
  WHEEL_SPIN_DURATION_MS,
} from "./lib/wheel-room-store";
import { readSocketSessionId } from "./lib/socket-session-id";
import { logger } from "./lib/logger";

export function setupWheel(io: Server) {
  const wheelNs = io.of("/wheel");

  wheelNs.on("connection", (socket: Socket) => {
    const sessionId = readSocketSessionId(socket);
    socket.join(sessionId);

    const isViewer = socket.handshake.query.viewer === "1";
    logger.info({ socketId: socket.id, sessionId, isViewer }, "Wheel connection");

    const state = cloneWheelRoomState(sessionId);
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
      socket.on("wheelSpin", () => {
        const spin = startWheelSpin(sessionId);
        if (!spin) return;

        const st = getWheelRoomState(sessionId);
        wheelNs.to(sessionId).emit("wheelSpinStart", {
          targetRotation: st.spinTargetRotation,
          durationMs: WHEEL_SPIN_DURATION_MS,
          segmentIndex: spin.segmentIndex,
        });

        setTimeout(() => {
          endWheelSpin(sessionId);
          wheelNs.to(sessionId).emit("wheelResult", {
            segmentIndex: spin.segmentIndex,
            label: WHEEL_SEGMENTS[spin.segmentIndex],
          });
        }, WHEEL_SPIN_DURATION_MS + 200);
      });

      socket.on("wheelResultDismiss", () => {
        wheelNs.to(sessionId).emit("wheelResultDismissed", {});
      });

      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id, sessionId }, "Wheel spinner disconnected");
      });
    } else {
      socket.on("disconnect", () => {
        logger.info({ socketId: socket.id, sessionId }, "Wheel viewer disconnected");
      });
    }
  });
}
