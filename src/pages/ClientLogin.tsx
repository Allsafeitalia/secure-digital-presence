import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, LogIn, ArrowLeft, KeyRound, Loader2, User, Phone, Send, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type ViewMode = "login" | "client-code" | "forgot-password" | "reset-password" | "otp-verification";

function detectAuthFlowFromUrl(): { isRecoveryOrInvite: boolean; type: string | null } {
  const hash = window.location.hash ?? "";
  const search = window.location.search ?? "";

  const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
  const searchParams = search ? new URLSearchParams(search) : null;

  const type = hashParams?.get("type") ?? searchParams?.get("type");
  const accessToken = hashParams?.get("access_token");
  const code = searchParams?.get("code");
  const token = searchParams?.get("token");

  const isFlowType = type === "recovery" || type === "invite" || type === "magiclink";
  if (isFlowType && (accessToken || code || token)) {
    return { isRecoveryOrInvite: true, type };
  }

  return { isRecoveryOrInvite: false, type: null };
}

function getUrlTokens(): { access_token: string | null; refresh_token: string | null } {
  const hash = window.location.hash;
  if (!hash) return { access_token: null, refresh_token: null };

  const hashParams = new URLSearchParams(hash.substring(1));
  return {
    access_token: hashParams.get("access_token"),
    refresh_token: hashParams.get("refresh_token"),
  };
}

function getUrlCode(): string | null {
  return new URLSearchParams(window.location.search).get("code");
}

export default function ClientLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Standard login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Client code login
  const [clientCode, setClientCode] = useState("");
  const [verificationValue, setVerificationValue] = useState("");
  const [verificationType, setVerificationType] = useState<"email" | "phone">("email");
  const [verifiedClientEmail, setVerifiedClientEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"password" | "code">("password");

  // Detect auth flow from URL IMMEDIATELY (before any async code)
  const authFlowRef = useRef(detectAuthFlowFromUrl());
  const [viewMode, setViewMode] = useState<ViewMode>(
    authFlowRef.current.isRecoveryOrInvite ? "reset-password" : "login"
  );

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

      // If we detected recovery/invite from URL, stay on reset-password
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

    (async () => {
      // Some invite/recovery flows use PKCE and redirect with ?code=...
      const code = getUrlCode();
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("exchangeCodeForSession error:", error);
        } else {
          // Remove ?code=... from URL (keep hash if present)
          window.history.replaceState(null, "", window.location.pathname + window.location.hash);
        }
      }

      // Initial session check
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      // If we detected recovery/invite from URL, stay on reset-password
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
    })();

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

  const handleClientCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientCode || !verificationValue) {
      toast({
        title: "Errore",
        description: "Inserisci il codice cliente e l'email o telefono",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the lookup function to verify client
      const { data: clients, error } = await supabase.rpc('lookup_client_for_ticket', {
        p_client_code: clientCode.toUpperCase(),
        p_email: verificationType === "email" ? verificationValue : undefined,
        p_phone: verificationType === "phone" ? verificationValue : undefined,
      });

      if (error) {
        console.error("Lookup error:", error);
        throw new Error("Errore durante la verifica");
      }

      if (!clients || clients.length === 0) {
        toast({
          title: "Cliente non trovato",
          description: "Il codice cliente e i dati di verifica non corrispondono. Riprova.",
          variant: "destructive",
        });
        return;
      }

      const client = clients[0];
      
      // Check if email matches for magic link
      if (!client.client_email) {
        toast({
          title: "Errore",
          description: "Nessuna email associata a questo cliente. Contatta l'assistenza.",
          variant: "destructive",
        });
        return;
      }

      // Store verified email for magic link
      setVerifiedClientEmail(client.client_email);

      // Send OTP code (not magic link) to verified client email
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: client.client_email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        console.error("OTP error:", otpError);
        throw new Error("Impossibile inviare il codice di verifica");
      }

      toast({
        title: "Codice inviato!",
        description: `Abbiamo inviato un codice di verifica a ${client.client_email}`,
      });

      setViewMode("otp-verification");
    } catch (error: any) {
      console.error("Client code verification error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile verificare il codice cliente",
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
      // Ensure we have an auth session (some flows provide tokens in #hash, others use ?code=...)
      let currentSession: Session | null = null;

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      currentSession = initialSession;

      // PKCE code exchange (if present)
      if (!currentSession) {
        const code = getUrlCode();
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn("exchangeCodeForSession error:", exchangeError);
          } else {
            window.history.replaceState(null, "", window.location.pathname + window.location.hash);
          }

          const {
            data: { session: sessionAfterExchange },
          } = await supabase.auth.getSession();
          currentSession = sessionAfterExchange;
        }
      }

      // Hash token session (legacy / implicit flow)
      if (!currentSession) {
        const { access_token, refresh_token } = getUrlTokens();
        if (access_token && refresh_token) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            throw new Error("Link scaduto o non valido. Richiedi un nuovo invito.");
          }

          currentSession = data.session;
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
        <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "password" | "code")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="password">Email + Password</TabsTrigger>
            <TabsTrigger value="code">Codice Cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
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
          </TabsContent>

          <TabsContent value="code">
            <form onSubmit={handleClientCodeVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-code">Codice Cliente</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="client-code"
                    type="text"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                    placeholder="CLI00001"
                    className="pl-10 uppercase"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Il tuo codice cliente univoco (es. CLI00001)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Verifica identità con</Label>
                <Tabs value={verificationType} onValueChange={(v) => setVerificationType(v as "email" | "phone")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="phone">Telefono</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-value">
                  {verificationType === "email" ? "Email" : "Numero di telefono"}
                </Label>
                <div className="relative">
                  {verificationType === "email" ? (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                  <Input
                    id="verification-value"
                    type={verificationType === "email" ? "email" : "tel"}
                    value={verificationValue}
                    onChange={(e) => setVerificationValue(e.target.value)}
                    placeholder={verificationType === "email" ? "la-tua@email.com" : "+39 123 456 7890"}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia codice di verifica
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mt-4">
                <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Riceverai un codice di verifica via email. Inseriscilo per accedere in modo sicuro!
                </p>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Se sei un nuovo cliente, riceverai un'email con le credenziali di accesso.
        </p>
      </CardContent>
    </>
  );

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length < 6) {
      toast({
        title: "Errore",
        description: "Inserisci il codice di verifica a 6 cifre",
        variant: "destructive",
      });
      return;
    }

    if (!verifiedClientEmail) {
      toast({
        title: "Errore",
        description: "Email di verifica non trovata. Riprova.",
        variant: "destructive",
      });
      setViewMode("login");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: verifiedClientEmail,
        token: otpCode,
        type: "email",
      });

      if (error) {
        console.error("OTP verification error:", error);
        throw new Error("Codice non valido o scaduto. Riprova.");
      }

      toast({
        title: "Accesso effettuato!",
        description: "Benvenuto nel portale clienti",
      });
      
      navigate("/client-portal");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Errore",
        description: error.message || "Codice non valido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderOtpVerificationForm = () => (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-green-500" />
        </div>
        <CardTitle className="text-2xl">Verifica codice</CardTitle>
        <CardDescription>
          Inserisci il codice ricevuto via email
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Abbiamo inviato un codice di verifica a:
          </p>
          <p className="font-medium">{verifiedClientEmail}</p>
        </div>

        <form onSubmit={handleOtpVerification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">Codice di verifica</Label>
            <Input
              id="otp-code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifica in corso...
              </>
            ) : (
              "Verifica e accedi"
            )}
          </Button>
        </form>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Il codice è valido per 5 minuti</p>
          <p>✓ Controlla anche la cartella spam</p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setViewMode("login");
            setClientCode("");
            setVerificationValue("");
            setVerifiedClientEmail(null);
            setOtpCode("");
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna al login
        </Button>
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
          {viewMode === "otp-verification" && renderOtpVerificationForm()}
          {viewMode === "forgot-password" && renderForgotPasswordForm()}
          {viewMode === "reset-password" && renderResetPasswordForm()}
        </Card>
      </div>
    </div>
  );
}
