import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Euro,
  Calendar,
  AlertTriangle,
  Power,
} from "lucide-react";
import { MaintenanceHistory } from "@/components/client/MaintenanceHistory";
import { PendingPayments } from "@/components/client/PendingPayments";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type ServiceType = "website" | "domain" | "hosting" | "backup" | "email" | "ssl" | "maintenance" | "other";
type ServiceStatus = "active" | "expiring_soon" | "expired" | "suspended" | "cancelled";
type BillingCycle = "monthly" | "quarterly" | "biannual" | "yearly" | "one_time";

interface ClientService {
  id: string;
  service_name: string;
  service_type: ServiceType;
  status: ServiceStatus;
  billing_cycle: BillingCycle;
  description: string | null;
  domain_name: string | null;
  server_name: string | null;
  expiration_date: string | null;
  url_to_monitor: string | null;
  is_online: boolean | null;
  last_check_at: string | null;
  last_response_time_ms: number | null;
  last_error: string | null;
  price: number | null;
  auto_renew: boolean;
}

interface CancellationRequest {
  id: string;
  service_id: string;
  status: string;
  reason: string;
  created_at: string;
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

const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  biannual: "Semestrale",
  yearly: "Annuale",
  one_time: "Una tantum",
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [services, setServices] = useState<ClientService[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ClientService | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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

      // Fetch cancellation requests
      const { data: cancelRequests, error: cancelError } = await supabase
        .from("service_cancellation_requests")
        .select("*")
        .eq("client_id", client.id);

      if (cancelError) {
        console.error("Error fetching cancellation requests:", cancelError);
      } else {
        setCancellationRequests(cancelRequests || []);
      }
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

  const openCancelModal = (service: ClientService) => {
    setSelectedService(service);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const handleSubmitCancellation = async () => {
    if (!selectedService || !clientData) return;

    if (!cancelReason.trim()) {
      toast({
        title: "Errore",
        description: "La motivazione è obbligatoria",
        variant: "destructive",
      });
      return;
    }

    if (cancelReason.trim().length < 10) {
      toast({
        title: "Errore",
        description: "La motivazione deve essere di almeno 10 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingCancel(true);

    try {
      const { error } = await supabase
        .from("service_cancellation_requests")
        .insert({
          service_id: selectedService.id,
          client_id: clientData.id,
          reason: cancelReason.trim(),
        });

      if (error) throw error;

      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di disattivazione è stata inviata e verrà elaborata a breve",
      });

      setShowCancelModal(false);
      setSelectedService(null);
      setCancelReason("");
      
      // Refresh data
      fetchClientData();
    } catch (error: any) {
      console.error("Error submitting cancellation:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare la richiesta",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const hasPendingCancellation = (serviceId: string) => {
    return cancellationRequests.some(
      (req) => req.service_id === serviceId && req.status === "pending"
    );
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

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/D";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const calculateNextRenewal = (service: ClientService) => {
    if (!service.expiration_date) return null;
    const expDate = new Date(service.expiration_date);
    const now = new Date();
    
    if (expDate <= now) return "Scaduto";
    
    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return `Fra ${diffDays} giorni`;
    if (diffDays <= 30) return `Fra ${Math.ceil(diffDays / 7)} settimane`;
    if (diffDays <= 90) return `Fra ${Math.ceil(diffDays / 30)} mesi`;
    
    return formatDate(service.expiration_date);
  };

  const activeServices = services.filter(s => s.status === "active" || s.status === "expiring_soon");
  const onlineServices = services.filter(s => s.is_online === true);
  const offlineServices = services.filter(s => s.is_online === false && s.url_to_monitor);

  // Calculate total cost
  const totalMonthlyCost = services
    .filter(s => s.status === "active" || s.status === "expiring_soon")
    .reduce((total, service) => {
      if (!service.price) return total;
      
      // Convert to monthly cost for comparison
      switch (service.billing_cycle) {
        case "monthly":
          return total + service.price;
        case "quarterly":
          return total + (service.price / 3);
        case "biannual":
          return total + (service.price / 6);
        case "yearly":
          return total + (service.price / 12);
        case "one_time":
          return total; // Don't include one-time costs in monthly
        default:
          return total;
      }
    }, 0);

  const totalYearlyCost = services
    .filter(s => s.status === "active" || s.status === "expiring_soon")
    .reduce((total, service) => {
      if (!service.price) return total;
      
      switch (service.billing_cycle) {
        case "monthly":
          return total + (service.price * 12);
        case "quarterly":
          return total + (service.price * 4);
        case "biannual":
          return total + (service.price * 2);
        case "yearly":
          return total + service.price;
        case "one_time":
          return total;
        default:
          return total;
      }
    }, 0);

  // Find next renewal
  const nextRenewalService = services
    .filter(s => s.expiration_date && (s.status === "active" || s.status === "expiring_soon"))
    .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime())[0];

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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Package className="w-6 h-6 text-primary" />
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
                <div className="p-3 rounded-full bg-green-500/10">
                  <Euro className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(totalYearlyCost)}</p>
                  <p className="text-sm text-muted-foreground">Costo Annuale</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Euro className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(totalMonthlyCost)}</p>
                  <p className="text-sm text-muted-foreground">Costo Mensile</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {nextRenewalService ? calculateNextRenewal(nextRenewalService) : "N/D"}
                  </p>
                  <p className="text-sm text-muted-foreground">Prossimo Rinnovo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Online/Offline Status */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Wifi className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{onlineServices.length}</p>
                  <p className="text-sm text-muted-foreground">Servizi Online</p>
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
                  <p className="text-sm text-muted-foreground">Servizi Offline</p>
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
                const pendingCancellation = hasPendingCancellation(service.id);

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

                      {/* Price and billing */}
                      <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{formatPrice(service.price)}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {billingCycleLabels[service.billing_cycle]}
                        </span>
                      </div>

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
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Scade il {formatDate(service.expiration_date)}</span>
                          </div>
                          {service.auto_renew && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Rinnovo auto
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Next renewal info */}
                      {service.expiration_date && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <Calendar className="w-4 h-4" />
                          <span>Prossimo rinnovo: {calculateNextRenewal(service)}</span>
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

                      {/* Cancellation section */}
                      <div className="pt-3 border-t">
                        {pendingCancellation ? (
                          <div className="flex items-center gap-2 text-amber-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Richiesta di disattivazione in attesa</span>
                          </div>
                        ) : service.status === "active" || service.status === "expiring_soon" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => openCancelModal(service)}
                          >
                            <Power className="w-4 h-4 mr-2" />
                            Richiedi Disattivazione
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Payments Section */}
        {clientData && (
          <PendingPayments clientId={clientData.id} onRefresh={fetchClientData} />
        )}

        {/* Maintenance History Section */}
        {clientData && (
          <MaintenanceHistory clientId={clientData.id} />
        )}
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

      {/* Cancellation Request Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Richiesta Disattivazione
            </DialogTitle>
            <DialogDescription>
              Stai richiedendo la disattivazione del servizio "{selectedService?.service_name}".
              Questa richiesta sarà esaminata dal nostro team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Nota:</p>
              <p>I servizi sono impostati per il rinnovo automatico. Una volta elaborata la tua richiesta, il servizio non verrà rinnovato alla prossima scadenza.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Motivazione <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Inserisci il motivo della disattivazione (minimo 10 caratteri)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                La motivazione è obbligatoria e ci aiuta a migliorare i nostri servizi.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmitCancellation}
              disabled={isSubmittingCancel || !cancelReason.trim()}
            >
              {isSubmittingCancel ? "Invio in corso..." : "Invia Richiesta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
