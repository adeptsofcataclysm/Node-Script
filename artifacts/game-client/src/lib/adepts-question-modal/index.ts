/**
 * Shared question modal for all Adepts quiz boards (`board` prop: 1 | 2 | 3).
 * Standalone Vite apps under `artifacts/adepts-game*` may still duplicate this file; sync from here if you update behavior.
 */
export { QuestionModal } from "./QuestionModal";
export type { AdeptsBoardId } from "@/lib/adepts-quiz-types";
