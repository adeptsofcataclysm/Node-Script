import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginPage } from "@/pages/LoginPage";
import { ViewerPage } from "@/pages/ViewerPage";
import { GamePage } from "@/pages/GamePage";
import { SpectatorPage } from "@/pages/SpectatorPage";
import { AdminGuard } from "@/pages/AdminGuard";
import { QuizAdeptsWheelPage } from "@/pages/QuizAdeptsWheelPage";

import AdeptsQuizHome from "@/apps/adepts-game/pages/Home";
import AdeptsQuizNotFound from "@/apps/adepts-game/pages/not-found";
import { GamePhaseArrows } from "@/components/GamePhaseArrows";
import { QuizNavSync } from "@/components/QuizNavSync";
import { QuizAdeptsWheelSync } from "@/components/QuizAdeptsWheelSync";
import { QuizPandoraRouletteSync } from "@/components/QuizPandoraRouletteSync";
import { QuizPandoraLottoSync } from "@/components/QuizPandoraLottoSync";
import { QuizReturnToLoginSync } from "@/components/QuizReturnToLoginSync";
import { AdeptsQuizBoardGuard } from "@/components/AdeptsQuizBoardGuard";
import { RequireLogin } from "@/components/RequireLogin";
import { AdeptsLobbyPage } from "@/pages/AdeptsLobbyPage";
import { PandoraLottoPage } from "@/pages/PandoraLottoPage";

const queryClient = new QueryClient();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function AdeptsWheelLegacyRedirect() {
  useEffect(() => {
    window.location.replace(`${base}/adepts/watch`);
  }, []);
  return null;
}

function AdeptsSpinRoute() {
  return <QuizAdeptsWheelPage viewerMode={false} />;
}

function AdeptsWatchRoute() {
  return <QuizAdeptsWheelPage viewerMode={true} />;
}

function LegacyAdeptsQuizRedirect({ suffix }: { suffix: "2" | "3" }) {
  useEffect(() => {
    window.location.replace(`${base}/adepts-game/${suffix}/`);
  }, [suffix]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router base={base}>
          <>
            <Switch>
              <Route path="/admin" component={AdminGuard} />
              <Route path="/adepts/spin" component={AdeptsSpinRoute} />
              <Route path="/adepts/watch" component={AdeptsWatchRoute} />
              <Route path="/adepts" component={AdeptsWheelLegacyRedirect} />
              <Route path="/watch" component={ViewerPage} />
              <Route path="/spectate" component={SpectatorPage} />
              <Route path="/pandora-lotto" component={PandoraLottoPage} />
              <Route path="/game" component={GamePage} />
              <Route path="/adepts-lobby" nest>
                <RequireLogin>
                  <Switch>
                    <Route path="/" component={AdeptsLobbyPage} />
                  </Switch>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game-2/:rest*">
                <LegacyAdeptsQuizRedirect suffix="2" />
              </Route>
              <Route path="/adepts-game-3/:rest*">
                <LegacyAdeptsQuizRedirect suffix="3" />
              </Route>
              <Route path="/adepts-game" nest>
                <RequireLogin>
                  <AdeptsQuizBoardGuard>
                    <Switch>
                      <Route path="/2">{() => <AdeptsQuizHome key={2} boardId={2} />}</Route>
                      <Route path="/3">{() => <AdeptsQuizHome key={3} boardId={3} />}</Route>
                      <Route path="/">{() => <AdeptsQuizHome key={1} boardId={1} />}</Route>
                      <Route component={AdeptsQuizNotFound} />
                    </Switch>
                  </AdeptsQuizBoardGuard>
                </RequireLogin>
              </Route>
              <Route path="/" component={LoginPage} />
            </Switch>
            <GamePhaseArrows />
            <QuizNavSync />
            <QuizAdeptsWheelSync />
            <QuizPandoraRouletteSync />
            <QuizPandoraLottoSync />
            <QuizReturnToLoginSync />
          </>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
