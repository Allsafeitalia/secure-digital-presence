import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, LogIn, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { User, Session } from "@supabase/supabase-js";

type ViewMode = "login" | "forgot-password" | "reset-password";

function detectAuthFlowFromHash(): { isRecoveryOrInvite: boolean; type: string | null } {
  const hash = window.location.hash;
  if (!hash) return { isRecoveryOrInvite: false, type: null };
  
  const hashParams = new URLSearchParams(hash.substring(1));
  const type = hashParams.get("type");
  const accessToken = hashParams.get("access_token");
  
  if ((type === "recovery" || type === "invite" || type === "magiclink") && accessToken) {
    return { isRecoveryOrInvite: true, type };
  }
  return { isRecoveryOrInvite: false, type: null };
}

export default function ClientLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  
  // Detect auth flow from URL hash IMMEDIATELY (before any async code)
  const authFlowRef = useRef(detectAuthFlowFromHash());
  const [viewMode, setViewMode] = useState<ViewMode>(
    authFlowRef.current.isRecoveryOrInvite ? "reset-password" : "login"
  );

  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      console.log("Auth state change:", event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle PASSWORD_RECOVERY event from Supabase
      if (event === "PASSWORD_RECOVERY") {
        setViewMode("reset-password");
        setInitializing(false);
        return;
      }
      
      // If we detected recovery/invite from hash, stay on reset-password
      if (authFlowRef.current.isRecoveryOrInvite) {
        setViewMode("reset-password");
        setInitializing(false);
        return;
      }
      
      // Only redirect to portal if user is logged in AND we're not in a password flow
      if (session?.user && event === "SIGNED_IN") {
        const isClient = session.user.user_metadata?.is_client;
        if (isClient) {
          navigate("/client-portal");
        }
      }
      
      setInitializing(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // If we detected recovery/invite from hash, stay on reset-password
      if (authFlowRef.current.isRecoveryOrInvite) {
        setViewMode("reset-password");
        setInitializing(false);
        return;
      }
      
      // Only redirect if user is already logged in and NOT in password flow
      if (session?.user) {
        const isClient = session.user.user_metadata?.is_client;
        if (isClient) {
          navigate("/client-portal");
        }
      }
      
      setInitializing(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Errore",
        description: "Inserisci email e password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Email o password non corretti");
        }
        throw error;
      }

      // Check if this is a client user
      const isClient = data.user?.user_metadata?.is_client;
      if (!isClient) {
        await supabase.auth.signOut();
        toast({
          title: "Accesso negato",
          description: "Questo portale è riservato ai clienti",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Benvenuto!",
        description: "Accesso effettuato con successo",
      });
      
      navigate("/client-portal");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Errore di accesso",
        description: error.message || "Impossibile effettuare l'accesso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Errore",
        description: "Inserisci la tua email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/client-login`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Email inviata",
        description: "Controlla la tua casella email per il link di recupero password",
      });
      
      setViewMode("login");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare l'email di recupero",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Compila entrambi i campi password",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if we have a session, if not try to establish one from the URL hash
      let currentSession = session;
      
      if (!currentSession) {
        // Try to get session from hash tokens
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          
          if (accessToken && refreshToken) {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error("Session error:", sessionError);
              throw new Error("Link scaduto o non valido. Richiedi un nuovo invito.");
            }
            
            currentSession = data.session;
          }
        }
      }
      
      if (!currentSession) {
        throw new Error("Sessione non trovata. Richiedi un nuovo invito.");
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast({
        title: "Password impostata",
        description: "La tua password è stata impostata con successo. Ora puoi accedere.",
      });
      
      // Clear the hash from URL and reset auth flow detection
      window.history.replaceState(null, "", window.location.pathname);
      authFlowRef.current = { isRecoveryOrInvite: false, type: null };
      
      // Sign out so they can login fresh with new password
      await supabase.auth.signOut();
      
      setViewMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile impostare la password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderLoginForm = () => (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Portale Clienti</CardTitle>
        <CardDescription>
          Accedi per monitorare i tuoi servizi
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.com"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              "Accedi"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setViewMode("forgot-password")}
          className="w-full text-sm text-primary hover:underline mt-4 text-center"
        >
          Password dimenticata?
        </button>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Se sei un nuovo cliente, riceverai un'email con un link per impostare la tua password.
        </p>
      </CardContent>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Recupera Password</CardTitle>
        <CardDescription>
          Inserisci la tua email per ricevere il link di recupero
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.com"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Invio in corso...
              </>
            ) : (
              "Invia link di recupero"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setViewMode("login")}
          className="w-full text-sm text-muted-foreground hover:text-foreground mt-4 text-center"
        >
          ← Torna al login
        </button>
      </CardContent>
    </>
  );

  const renderResetPasswordForm = () => (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Imposta Password</CardTitle>
        <CardDescription>
          Scegli una password sicura per il tuo account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nuova Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Conferma Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Imposta Password"
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          La password deve essere di almeno 6 caratteri.
        </p>
      </CardContent>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Torna al sito
        </Link>

        <Card className="shadow-xl">
          {viewMode === "login" && renderLoginForm()}
          {viewMode === "forgot-password" && renderForgotPasswordForm()}
          {viewMode === "reset-password" && renderResetPasswordForm()}
        </Card>
      </div>
    </div>
  );
}
