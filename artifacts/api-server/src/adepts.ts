import type { Server, Socket } from "socket.io";
import { socketClaimsAdeptsHostRole } from "./lib/adepts-quiz-board-host-auth";
import {
  applyHostAdjustScore,
  applyHostJudgeAnswer,
  applyHostQuizRelay,
  applyHostRevealAnswer,
  applyQuizBoardHover,
  applyHostSetTurn,
  applyHostClearActiveCard,
  applyActiveQuizPatch,
  applyPickCell,
  cloneQuizRelay,
  getQuizRelayOrDefault,
} from "./lib/adepts-quiz-room-store";
import { parseAdeptsPhase } from "./lib/adepts-session-fsm";
import {
  cloneAdeptsSession,
  ensureAdeptsSession,
  getMutableAdeptsSession,
  lotteryDraw,
  lotteryOptOut,
  lotterySetCandidates,
  openingEmojiNext,
  openingEmojiPrev,
  openingMarkCorrect,
  replaceWheelState,
  spectatorPlaceBet,
  spectatorPicksLock,
  transitionAdeptsSession,
} from "./lib/adepts-session-store";
import type { SeatIndex } from "./lib/adepts-session-types";
import { readSocketSessionId } from "./lib/socket-session-id";
import {
  endWheelSpin,
  getWheelRoomState,
  startWheelSpin,
  WHEEL_SEGMENTS,
  WHEEL_SPIN_DURATION_MS,
} from "./lib/wheel-room-store";
import { logger } from "./lib/logger";

function readSeat(socket: Socket): number | null {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const raw = auth?.["seat"];
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 4) return null;
  return n;
}

/**
 * Seat from handshake; optional `cmd.seat` must match auth when both are present (players).
 * Host sends `cmd.seat === currentTurnSeat` while handshake `seat` stays 0 — do not treat as spoof.
 */
function resolvePickSeat(socket: Socket, cmd: Record<string, unknown>, isHost: boolean): number | null {
  const authSeat = readSeat(socket);
  const rawCmd = cmd["seat"];
  let cmdSeat: number | null = null;
  if (rawCmd !== undefined && rawCmd !== null) {
    const c = typeof rawCmd === "number" ? rawCmd : Number(rawCmd);
    if (Number.isInteger(c) && c >= 0 && c <= 4) cmdSeat = c;
  }
  if (isHost && cmdSeat !== null) return cmdSeat;
  if (authSeat !== null) {
    if (cmdSeat !== null && cmdSeat !== authSeat) return null;
    return authSeat;
  }
  return cmdSeat;
}

function readSpectatorKey(socket: Socket): string {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const raw = auth?.["spectatorKey"];
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 128);
  return socket.id;
}

/** Keep `session.currentTurnSeat` aligned with authoritative quiz relay (0–4). */
function mirrorSessionTurnFromQuiz(sessionId: string): void {
  const session = getMutableAdeptsSession(sessionId);
  if (!session) return;
  const q = getQuizRelayOrDefault(sessionId);
  session.currentTurnSeat = ((q.currentTurnSeat % 5) + 5) % 5;
}

function emitAdeptsStateToSocket(socket: Socket, sessionId: string): void {
  mirrorSessionTurnFromQuiz(sessionId);
  const session = getMutableAdeptsSession(sessionId);
  const quiz = cloneQuizRelay(sessionId);
  socket.emit("sync", {
    sessionId,
    version: session?.version ?? 0,
    session: session ? cloneAdeptsSession(session) : null,
    quiz,
  });
}

/** Синк квиза + сессии рулетки в комнату `sessionId` (например после старта игры из `quiz-nav`). */
export function broadcastAdeptsQuizSync(io: Server, sessionId: string, originSocket?: Socket): void {
  mirrorSessionTurnFromQuiz(sessionId);
  const session = getMutableAdeptsSession(sessionId);
  const quiz = cloneQuizRelay(sessionId);
  const payload = {
    sessionId,
    version: session?.version ?? 0,
    session: session ? cloneAdeptsSession(session) : null,
    quiz,
  };
  io.of("/adepts").to(sessionId).emit("sync", payload);
  io.of("/quiz").to(sessionId).emit("sync", quiz);
  /** Some adapters / `to(room)` paths omit the initiating socket; echo so pick/host always applies locally. */
  originSocket?.emit("sync", payload);
}

function broadcastSync(io: Server, sessionId: string, originSocket?: Socket): void {
  broadcastAdeptsQuizSync(io, sessionId, originSocket);
}

export function setupAdepts(io: Server): void {
  const ns = io.of("/adepts");

  ns.on("connection", (socket: Socket) => {
    const sessionId = readSocketSessionId(socket);
    socket.join(sessionId);
    ensureAdeptsSession(sessionId);
    logger.info({ socketId: socket.id, sessionId }, "Adepts client connected");

    /** Defer so the browser can attach `sync` listeners after `io()` returns (avoids missed first sync). */
    setImmediate(() => {
      emitAdeptsStateToSocket(socket, sessionId);
    });

    socket.on("requestAdeptsSync", () => {
      emitAdeptsStateToSocket(socket, sessionId);
    });

    socket.on("command", (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const cmd = raw as Record<string, unknown>;
      const type = cmd["type"];
      const host = socketClaimsAdeptsHostRole(socket);
      const seat = readSeat(socket);

      const run = (): void => {
        broadcastSync(io, sessionId, socket);
      };

      switch (type) {
        case "hostQuizRelay": {
          if (!host) return;
          const r = applyHostQuizRelay(sessionId, cmd["payload"]);
          if (!r.ok) return;
          run();
          return;
        }
        case "activeQuizPatch": {
          const seatResolved = resolvePickSeat(socket, cmd, host);
          if (!host && seatResolved === null) {
            logger.warn({ sessionId, socketId: socket.id }, "activeQuizPatch rejected: no seat");
            return;
          }
          const r = applyActiveQuizPatch(sessionId, {
            isHost: host,
            playerSeat: host ? null : seatResolved,
            patch: cmd["patch"],
            nextTurnSeat: cmd["nextTurnSeat"],
          });
          if (!r.ok) {
            logger.warn(
              { sessionId, socketId: socket.id, err: r.error },
              "activeQuizPatch rejected",
            );
            return;
          }
          run();
          return;
        }
        case "pickCell": {
          const seatResolved = resolvePickSeat(socket, cmd, host);
          if (!host && seatResolved === null) {
            logger.warn({ sessionId, socketId: socket.id }, "pickCell rejected: no seat");
            return;
          }
          const t = Number(cmd["themeIndex"]);
          const q = Number(cmd["questionIndex"]);
          const seatForPick = host ? (seatResolved ?? seat ?? 0) : seatResolved!;
          let r = applyPickCell(sessionId, seatForPick, t, q, { hostBypass: host });
          if (!r.ok && host && r.error === "card already open") {
            applyHostClearActiveCard(sessionId);
            r = applyPickCell(sessionId, seatForPick, t, q, { hostBypass: host });
          }
          if (!r.ok) {
            logger.warn(
              { sessionId, socketId: socket.id, err: r.error, themeIndex: t, questionIndex: q, seat: seatForPick },
              "pickCell rejected",
            );
            return;
          }
          run();
          return;
        }
        case "hostRevealAnswer": {
          if (!host) return;
          const r = applyHostRevealAnswer(sessionId);
          if (!r.ok) return;
          run();
          return;
        }
        case "hostJudgeAnswer": {
          if (!host) return;
          const result = cmd["result"] === "wrong" ? "wrong" : "correct";
          const r = applyHostJudgeAnswer(sessionId, result);
          if (!r.ok) return;
          run();
          return;
        }
        case "hostSetHover": {
          const seatResolved = resolvePickSeat(socket, cmd, host);
          if (!host && seatResolved === null) {
            logger.warn({ sessionId, socketId: socket.id }, "hostSetHover rejected: no seat");
            return;
          }
          const cell = cmd["cell"];
          if (cell === undefined) {
            run();
            return;
          }

          let parsed: { themeIndex: number; questionIndex: number } | null;
          if (cell === null) {
            parsed = null;
          } else if (cell && typeof cell === "object") {
            const o = cell as Record<string, unknown>;
            const ti = Number(o["themeIndex"]);
            const qi = Number(o["questionIndex"]);
            if (Number.isInteger(ti) && Number.isInteger(qi)) {
              parsed = { themeIndex: ti, questionIndex: qi };
            } else {
              run();
              return;
            }
          } else {
            run();
            return;
          }

          const r = applyQuizBoardHover(sessionId, {
            isHost: host,
            playerSeat: host ? null : seatResolved!,
          }, parsed);
          if (!r.ok) {
            logger.warn({ sessionId, socketId: socket.id, err: r.error }, "hostSetHover rejected");
            return;
          }
          run();
          return;
        }
        case "hostSetTurn": {
          if (!host) return;
          applyHostSetTurn(sessionId, Number(cmd["seat"]));
          run();
          return;
        }
        case "hostAdjustScore": {
          if (!host) return;
          applyHostAdjustScore(sessionId, Number(cmd["seat"]), Number(cmd["delta"]));
          run();
          return;
        }
        case "hostClearActiveCard": {
          if (!host) return;
          applyHostClearActiveCard(sessionId);
          run();
          return;
        }
        case "transitionPhase": {
          if (!host) return;
          const to = parseAdeptsPhase(cmd["to"]);
          if (!to) return;
          const tr = transitionAdeptsSession(sessionId, to);
          if (!tr.ok) return;
          run();
          return;
        }
        case "openingEmojiNext": {
          if (!host) return;
          if (openingEmojiNext(sessionId).ok) run();
          return;
        }
        case "openingEmojiPrev": {
          if (!host) return;
          if (openingEmojiPrev(sessionId).ok) run();
          return;
        }
        case "openingMarkCorrect": {
          if (!host) return;
          const nick = String(cmd["nick"] ?? "").trim();
          if (openingMarkCorrect(sessionId, nick).ok) run();
          return;
        }
        case "spectatorPlaceBet": {
          const st = Number(cmd["seat"]);
          if (st !== 1 && st !== 2 && st !== 3 && st !== 4 && st !== 5) return;
          const key = readSpectatorKey(socket);
          if (spectatorPlaceBet(sessionId, key, st as SeatIndex).ok) run();
          return;
        }
        case "spectatorPicksLock": {
          if (!host) return;
          if (spectatorPicksLock(sessionId).ok) run();
          return;
        }
        case "lotterySetCandidates": {
          if (!host) return;
          const rawList = cmd["candidates"];
          const list = Array.isArray(rawList) ? rawList.map((x) => String(x)) : [];
          if (lotterySetCandidates(sessionId, list).ok) run();
          return;
        }
        case "lotteryOptOut": {
          const nick = String(cmd["nick"] ?? "").trim();
          if (lotteryOptOut(sessionId, nick).ok) run();
          return;
        }
        case "lotteryDraw": {
          if (!host) return;
          if (lotteryDraw(sessionId).ok) run();
          return;
        }
        case "wheelSpin": {
          if (!host) return;
          const sess = getMutableAdeptsSession(sessionId);
          if (!sess || sess.phase.kind !== "mini_wheel" || !sess.wheel) return;
          const spin = startWheelSpin(sessionId);
          if (!spin) return;
          const wm = getWheelRoomState(sessionId);
          replaceWheelState(sessionId, { ...wm });

          io.of("/wheel").to(sessionId).emit("wheelSpinStart", {
            targetRotation: wm.spinTargetRotation,
            durationMs: WHEEL_SPIN_DURATION_MS,
            segmentIndex: spin.segmentIndex,
          });

          const segIdx = spin.segmentIndex;
          setTimeout(() => {
            endWheelSpin(sessionId);
            const wm2 = getWheelRoomState(sessionId);
            const cur = getMutableAdeptsSession(sessionId);
            if (cur?.wheel) replaceWheelState(sessionId, { ...wm2 });
            io.of("/wheel").to(sessionId).emit("wheelResult", {
              segmentIndex: segIdx,
              label: WHEEL_SEGMENTS[segIdx] ?? "",
            });
            broadcastSync(io, sessionId);
          }, WHEEL_SPIN_DURATION_MS + 200);

          run();
          return;
        }
        case "wheelResultDismiss": {
          if (!host) return;
          io.of("/wheel").to(sessionId).emit("wheelResultDismissed", {});
          return;
        }
        default:
          return;
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, sessionId }, "Adepts client disconnected");
    });
  });
}
