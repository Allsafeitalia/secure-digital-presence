import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Server,
  Shield,
  Mail,
  HardDrive,
  Database,
  Wrench,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  LogOut,
  Key,
  User,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type ServiceType = "website" | "domain" | "hosting" | "backup" | "email" | "ssl" | "maintenance" | "other";
type ServiceStatus = "active" | "expiring_soon" | "expired" | "suspended" | "cancelled";

interface ClientService {
  id: string;
  service_name: string;
  service_type: ServiceType;
  status: ServiceStatus;
  description: string | null;
  domain_name: string | null;
  server_name: string | null;
  expiration_date: string | null;
  url_to_monitor: string | null;
  is_online: boolean | null;
  last_check_at: string | null;
  last_response_time_ms: number | null;
  last_error: string | null;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  ragione_sociale: string | null;
}

const serviceTypeConfig: Record<ServiceType, { icon: React.ElementType; label: string; color: string }> = {
  website: { icon: Globe, label: "Sito Web", color: "bg-blue-500" },
  domain: { icon: Globe, label: "Dominio", color: "bg-purple-500" },
  hosting: { icon: Server, label: "Hosting", color: "bg-green-500" },
  backup: { icon: Database, label: "Backup", color: "bg-orange-500" },
  email: { icon: Mail, label: "Email", color: "bg-pink-500" },
  ssl: { icon: Shield, label: "SSL", color: "bg-yellow-500" },
  maintenance: { icon: Wrench, label: "Manutenzione", color: "bg-indigo-500" },
  other: { icon: Package, label: "Altro", color: "bg-gray-500" },
};

const statusConfig: Record<ServiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Attivo", variant: "default" },
  expiring_soon: { label: "In scadenza", variant: "secondary" },
  expired: { label: "Scaduto", variant: "destructive" },
  suspended: { label: "Sospeso", variant: "outline" },
  cancelled: { label: "Cancellato", variant: "outline" },
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [services, setServices] = useState<ClientService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/client-login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/client-login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    if (!user) return;

    try {
      // Fetch client info
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, name, email, ragione_sociale")
        .eq("client_user_id", user.id)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!client) {
        toast({
          title: "Errore",
          description: "Account cliente non trovato",
          variant: "destructive",
        });
        return;
      }

      setClientData(client);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("client_services")
        .select("*")
        .eq("client_id", client.id)
        .order("service_name");

      if (servicesError) throw servicesError;

      setServices(servicesData || []);
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchClientData();
    setIsRefreshing(false);
    toast({
      title: "Aggiornato",
      description: "I dati sono stati aggiornati",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/client-login");
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new,
      });

      if (error) throw error;

      toast({
        title: "Password cambiata",
        description: "La tua password è stata aggiornata con successo",
      });
      setShowPasswordModal(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile cambiare la password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/D";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatLastCheck = (dateString: string | null) => {
    if (!dateString) return "Mai";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Adesso";
    if (diffMins < 60) return `${diffMins} min fa`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    return formatDate(dateString);
  };

  const activeServices = services.filter(s => s.status === "active");
  const onlineServices = services.filter(s => s.is_online === true);
  const offlineServices = services.filter(s => s.is_online === false && s.url_to_monitor);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pannello Cliente</h1>
            {clientData && (
              <p className="text-muted-foreground">
                Benvenuto, {clientData.ragione_sociale || clientData.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
              <Key className="w-4 h-4 mr-2" />
              Cambia Password
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{services.length}</p>
                  <p className="text-sm text-muted-foreground">Servizi Totali</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeServices.length}</p>
                  <p className="text-sm text-muted-foreground">Servizi Attivi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Wifi className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{onlineServices.length}</p>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${offlineServices.length > 0 ? "bg-red-500/10" : "bg-muted"}`}>
                  <WifiOff className={`w-6 h-6 ${offlineServices.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{offlineServices.length}</p>
                  <p className="text-sm text-muted-foreground">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">I Tuoi Servizi</h2>
          
          {services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun servizio attivo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const config = serviceTypeConfig[service.service_type];
                const Icon = config.icon;
                const statusConf = statusConfig[service.status];

                return (
                  <Card key={service.id} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${config.color}`} />
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.color}/10`}>
                            <Icon className={`w-5 h-5`} style={{ color: config.color.replace("bg-", "") }} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{service.service_name}</CardTitle>
                            <CardDescription>{config.label}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}

                      {service.domain_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span>{service.domain_name}</span>
                        </div>
                      )}

                      {service.server_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <span>{service.server_name}</span>
                        </div>
                      )}

                      {service.expiration_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>Scade il {formatDate(service.expiration_date)}</span>
                        </div>
                      )}

                      {/* Monitoring Status */}
                      {service.url_to_monitor && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {service.is_online ? (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-sm text-green-600 font-medium">Online</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-sm text-red-600 font-medium">Offline</span>
                                </>
                              )}
                            </div>
                            {service.last_response_time_ms && service.is_online && (
                              <span className="text-xs text-muted-foreground">
                                {service.last_response_time_ms}ms
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            Ultimo controllo: {formatLastCheck(service.last_check_at)}
                          </p>
                          
                          {service.last_error && !service.is_online && (
                            <p className="text-xs text-red-500 mt-1">
                              Errore: {service.last_error}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>
              Inserisci la tua nuova password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                placeholder="Minimo 6 caratteri"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Ripeti la password"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Salvataggio..." : "Salva Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
