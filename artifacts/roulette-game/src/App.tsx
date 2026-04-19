import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GamePage } from "@/pages/GamePage";
import { SpectatorPage } from "@/pages/SpectatorPage";

const queryClient = new QueryClient();

const isSpectator = window.location.pathname.endsWith("/spectate") ||
                    window.location.pathname.endsWith("/spectate/");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isSpectator ? <SpectatorPage /> : <GamePage />}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
