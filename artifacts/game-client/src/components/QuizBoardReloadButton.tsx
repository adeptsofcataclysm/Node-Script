import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { getQuizNavSocket } from "@/hooks/quizNavSocket";

/** Только ведущий: сброс сессии для всех и переход на страницу входа. */
export function QuizBoardReloadButton() {
  const { isSpectator } = useRole();
  if (isSpectator) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Перезагрузить игру — все вернутся на страницу входа"
      aria-label="Перезагрузить игру"
      className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
      onClick={() => getQuizNavSocket().emit("hostReturnToLogin")}
    >
      <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
    </Button>
  );
}
