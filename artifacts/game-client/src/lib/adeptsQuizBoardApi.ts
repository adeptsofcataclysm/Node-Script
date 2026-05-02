import type { AdeptsBoardId, Question } from "@/lib/adepts-quiz-types";

export type AdeptsQuizBoardPayload = {
  themes: string[];
  questions: Question[][];
};

function apiBase(boardId: AdeptsBoardId): string {
  return `/api/adepts-quiz-board/${boardId}`;
}

export async function fetchAdeptsQuizBoard(boardId: AdeptsBoardId): Promise<AdeptsQuizBoardPayload> {
  const res = await fetch(apiBase(boardId));
  if (!res.ok) {
    throw new Error(`fetchAdeptsQuizBoard: ${res.status}`);
  }
  const data = (await res.json()) as AdeptsQuizBoardPayload;
  if (!Array.isArray(data.themes) || !Array.isArray(data.questions)) {
    throw new Error("fetchAdeptsQuizBoard: invalid payload");
  }
  return data;
}

export async function patchAdeptsQuizTheme(
  boardId: AdeptsBoardId,
  index: number,
  name: string
): Promise<AdeptsQuizBoardPayload> {
  const res = await fetch(`${apiBase(boardId)}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: unknown }).error)
        : `patch theme: ${res.status}`
    );
  }
  return res.json() as Promise<AdeptsQuizBoardPayload>;
}

export async function patchAdeptsQuizQuestion(
  boardId: AdeptsBoardId,
  themeIndex: number,
  questionIndex: number,
  patch: Partial<Question>
): Promise<AdeptsQuizBoardPayload> {
  const { used: _u, ...rest } = patch;
  const res = await fetch(`${apiBase(boardId)}/question`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeIndex, questionIndex, patch: rest }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: unknown }).error)
        : `patch question: ${res.status}`
    );
  }
  return res.json() as Promise<AdeptsQuizBoardPayload>;
}
