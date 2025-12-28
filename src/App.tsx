import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import ClientPortal from "./pages/ClientPortal";
import ClientLogin from "./pages/ClientLogin";
import { useChristmasTheme } from "./hooks/useChristmasTheme";
import { ChristmasEffects } from "./components/ChristmasEffects";

const queryClient = new QueryClient();

const AppContent = () => {
  const isChristmas = useChristmasTheme();
  
  return (
    <>
      {isChristmas && <ChristmasEffects />}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/client-portal" element={<ClientPortal />} />
          <Route path="/client-login" element={<ClientLogin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
