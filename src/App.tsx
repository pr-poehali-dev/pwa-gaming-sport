
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthScreen from "./components/AuthScreen";
import { auth } from "./api";

const queryClient = new QueryClient();

interface User {
  id: number;
  nickname: string;
  rank_level: number;
  streak_days: number;
  is_admin: boolean;
}

function AppInner() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check URL for verify token
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get("verify") || undefined;

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { setLoading(false); return; }
    auth.me().then(res => {
      if (res.id) setUser(res);
      else localStorage.removeItem("auth_token");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function handleAuth(u: User, _token: string) {
    setUser(u);
    // Clear verify param from URL
    window.history.replaceState({}, "", "/");
  }

  function handleLogout() {
    auth.logout();
    localStorage.removeItem("auth_token");
    setUser(null);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#080808] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !verifyToken) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (!user && verifyToken) {
    return <AuthScreen onAuth={handleAuth} initialVerifyToken={verifyToken} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index user={user!} onLogout={handleLogout} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;