import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HostPage } from "@/pages/HostPage";
import { ViewerPage } from "@/pages/ViewerPage";
import { GamePage } from "@/pages/GamePage";
import { SpectatorPage } from "@/pages/SpectatorPage";

const queryClient = new QueryClient();

const path = window.location.pathname;
const isWatch = path.endsWith("/watch") || path.endsWith("/watch/");
const isSpectator = path.endsWith("/spectate") || path.endsWith("/spectate/");
const isOldGame = path.endsWith("/game") || path.endsWith("/game/");

function App() {
  let page;
  if (isWatch) {
    page = <ViewerPage />;
  } else if (isSpectator) {
    page = <SpectatorPage />;
  } else if (isOldGame) {
    page = <GamePage />;
  } else {
    page = <HostPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {page}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
