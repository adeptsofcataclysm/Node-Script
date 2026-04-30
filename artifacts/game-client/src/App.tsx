import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginPage } from "@/pages/LoginPage";
import { ViewerPage } from "@/pages/ViewerPage";
import { GamePage } from "@/pages/GamePage";
import { SpectatorPage } from "@/pages/SpectatorPage";
import { AdminGuard } from "@/pages/AdminGuard";
import { AdeptsHostPage } from "@/pages/AdeptsHostPage";

import Adepts1Home from "@/apps/adepts-game/pages/Home";
import Adepts1NotFound from "@/apps/adepts-game/pages/not-found";
import Adepts2Home from "@/apps/adepts-game-2/pages/Home";
import Adepts2NotFound from "@/apps/adepts-game-2/pages/not-found";
import Adepts3Home from "@/apps/adepts-game-3/pages/Home";
import Adepts3NotFound from "@/apps/adepts-game-3/pages/not-found";
import { GamePhaseArrows } from "@/components/GamePhaseArrows";
import { QuizNavSync } from "@/components/QuizNavSync";
import { RequireLogin } from "@/components/RequireLogin";

const queryClient = new QueryClient();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router base={base}>
          <>
            <Switch>
              <Route path="/admin" component={AdminGuard} />
              <Route path="/adepts" component={AdeptsHostPage} />
              <Route path="/watch" component={ViewerPage} />
              <Route path="/spectate" component={SpectatorPage} />
              <Route path="/game" component={GamePage} />
              <Route path="/adepts-game" nest>
                <RequireLogin>
                  <Switch>
                    <Route path="/" component={Adepts1Home} />
                    <Route component={Adepts1NotFound} />
                  </Switch>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game-2" nest>
                <RequireLogin>
                  <Switch>
                    <Route path="/" component={Adepts2Home} />
                    <Route component={Adepts2NotFound} />
                  </Switch>
                </RequireLogin>
              </Route>
              <Route path="/adepts-game-3" nest>
                <RequireLogin>
                  <Switch>
                    <Route path="/" component={Adepts3Home} />
                    <Route component={Adepts3NotFound} />
                  </Switch>
                </RequireLogin>
              </Route>
              <Route path="/" component={LoginPage} />
            </Switch>
            <GamePhaseArrows />
            <QuizNavSync />
          </>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
