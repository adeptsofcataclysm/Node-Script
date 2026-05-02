import { useEffect, useMemo, useState } from "react";
import { getQuizNavSocket, subscribeQuizNavSocketReplace } from "@/hooks/quizNavSocket";
import { getAdeptsSessionId } from "@/lib/adeptsSessionId";
import type { LobbyQuizPollPlayerRow } from "@/components/LobbyQuizPlayersTable";

/**
 * Ники зрителей из `quizLobbyRoster` для текущей сессии: не ведущий и не в списке исключений
 * (места за столом рулетки и т.п.).
 */
export function useQuizSpectatorNicksForLotto(excludeNicks: string[]): string[] {
  const excludeLower = useMemo(
    () => new Set(excludeNicks.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [excludeNicks.join("\u0001")],
  );

  const [rows, setRows] = useState<LobbyQuizPollPlayerRow[]>([]);

  useEffect(() => {
    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const s = getQuizNavSocket();
      const mySession = () => getAdeptsSessionId();
      const onRoster = (payload: unknown) => {
        const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        if (o["allSessions"] === true) {
          setRows([]);
          return;
        }
        const sid = o["sessionId"];
        if (sid != null && String(sid) !== mySession()) return;
        const pl = o["players"];
        setRows(Array.isArray(pl) ? (pl as LobbyQuizPollPlayerRow[]) : []);
      };
      const onConnect = () => {
        s.emit("requestQuizLobbyRoster");
      };
      s.on("quizLobbyRoster", onRoster);
      s.on("connect", onConnect);
      if (s.connected) s.emit("requestQuizLobbyRoster");
      detach = () => {
        s.off("quizLobbyRoster", onRoster);
        s.off("connect", onConnect);
      };
    };

    bind();
    const unsub = subscribeQuizNavSocketReplace(bind);
    return () => {
      unsub();
      detach?.();
    };
  }, []);

  return useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.role === "host") continue;
      const n = r.nick.trim();
      if (!n) continue;
      const k = n.toLowerCase();
      if (excludeLower.has(k)) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [rows, excludeLower]);
}
