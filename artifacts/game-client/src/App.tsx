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

import Adepts1Home from "@/apps/adepts-game/pages/Home";
import Adepts1NotFound from "@/apps/adepts-game/pages/not-found";
import Adepts2Home from "@/apps/adepts-game-2/pages/Home";
import Adepts2NotFound from "@/apps/adepts-game-2/pages/not-found";
import Adepts3Home from "@/apps/adepts-game-3/pages/Home";
import Adepts3NotFound from "@/apps/adepts-game-3/pages/not-found";
import { GamePhaseArrows } from "@/components/GamePhaseArrows";
import { QuizNavSync } from "@/components/QuizNavSync";
import { QuizAdeptsWheelSync } from "@/components/QuizAdeptsWheelSync";
import { QuizReturnToLoginSync } from "@/components/QuizReturnToLoginSync";
import { AdeptsQuizBoardGuard } from "@/components/AdeptsQuizBoardGuard";
import { RequireLogin } from "@/components/RequireLogin";
import { AdeptsLobbyPage } from "@/pages/AdeptsLobbyPage";

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
              <Route path="/game" component={GamePage} />
              <Route path="/adepts-lobby" nest>
                <RequireLogin>
                  <Switch>
                    <Route path="/" component={AdeptsLobbyPage} />
                  </Switch>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game" nest>
                <RequireLogin>
                  <AdeptsQuizBoardGuard>
                    <Switch>
                      <Route path="/" component={Adepts1Home} />
                      <Route component={Adepts1NotFound} />
                    </Switch>
                  </AdeptsQuizBoardGuard>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game-2" nest>
                <RequireLogin>
                  <AdeptsQuizBoardGuard>
                    <Switch>
                      <Route path="/" component={Adepts2Home} />
                      <Route component={Adepts2NotFound} />
                    </Switch>
                  </AdeptsQuizBoardGuard>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game-3" nest>
                <RequireLogin>
                  <AdeptsQuizBoardGuard>
                    <Switch>
                      <Route path="/" component={Adepts3Home} />
                      <Route component={Adepts3NotFound} />
                    </Switch>
                  </AdeptsQuizBoardGuard>
                </RequireLogin>
              </Route>
              <Route path="/" component={LoginPage} />
            </Switch>
            <GamePhaseArrows />
            <QuizNavSync />
            <QuizAdeptsWheelSync />
            <QuizReturnToLoginSync />
          </>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
