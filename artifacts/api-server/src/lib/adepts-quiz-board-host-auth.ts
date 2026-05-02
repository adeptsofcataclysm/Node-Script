import type { RequestHandler } from "express";
import type { Socket } from "socket.io";

/**
 * HTTP mutations that were previously gated by a shared env secret are open.
 * Restrict access at deploy time (network, reverse proxy, or future auth).
 */
export const requireAdeptsHostAuth: RequestHandler = (_req, _res, next) => {
  next();
};

function queryParamLower(q: Record<string, unknown> | undefined, key: string): string {
  if (!q) return "";
  const raw = q[key];
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

/**
 * `/adepts` Socket.io: `handshake.auth.role` from the client (preferred).
 * Fallback: `handshake.query.adeptsRole` — some stacks drop or alter `auth` on the wire.
 */
export function socketClaimsAdeptsHostRole(socket: Socket): boolean {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const role = auth?.["role"];
  if (typeof role === "string" && role.trim().toLowerCase() === "host") return true;
  if (role === "host") return true;
  return queryParamLower(socket.handshake.query as Record<string, unknown>, "adeptsRole") === "host";
}
