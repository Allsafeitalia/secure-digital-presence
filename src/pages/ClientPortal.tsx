import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  BarChart3,
  Receipt,
} from "lucide-react";
import { MaintenanceHistory } from "@/components/client/MaintenanceHistory";
import { PendingPayments } from "@/components/client/PendingPayments";
import { AnalyticsDashboard } from "@/components/client/AnalyticsDashboard";
import { ClientInvoicesList } from "@/components/client/ClientInvoicesList";
import { ServicePaymentDialog } from "@/components/client/ServicePaymentDialog";

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
  order_number: string | null;

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

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payService, setPayService] = useState<ClientService | null>(null);


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

  const daysUntilExpiration = (service: ClientService) => {
    if (!service.expiration_date) return null;
    const expDate = new Date(service.expiration_date);
    const now = new Date();
    return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // La disdetta è consentita solo nell'ultimo mese prima della scadenza
  const canRequestCancellation = (service: ClientService) => {
    if (service.status !== "active" && service.status !== "expiring_soon") return false;
    if (hasPendingCancellation(service.id)) return false;
    const days = daysUntilExpiration(service);
    if (days === null) return false;
    return days > 0 && days <= 30;
  };

  const expiringServices = services
    .filter((s) => {
      const days = daysUntilExpiration(s);
      return (
        days !== null &&
        days > 0 &&
        days <= 60 &&
        (s.status === "active" || s.status === "expiring_soon")
      );
    })
    .sort(
      (a, b) =>
        new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime()
    );

  const activeServices = services.filter(s => s.status === "active" || s.status === "expiring_soon");

  const isServiceOnline = (s: ClientService) =>
    (s.status === "active" || s.status === "expiring_soon") && s.is_online === true;
  const isServiceOffline = (s: ClientService) =>
    s.status === "suspended" || (s.is_online === false && !!s.url_to_monitor);
  const onlineServices = services.filter(isServiceOnline);
  const offlineServices = services.filter(isServiceOffline);

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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <Package className="h-4 w-4" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4" />
              Fatture
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiche Sito
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              Manutenzioni
            </TabsTrigger>
          </TabsList>


          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
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
                    <div className="p-3 rounded-full bg-accent/50">
                      <Euro className="w-6 h-6 text-accent-foreground" />
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
                    <div className="p-3 rounded-full bg-secondary">
                      <Euro className="w-6 h-6 text-secondary-foreground" />
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
                    <div className="p-3 rounded-full bg-muted">
                      <Calendar className="w-6 h-6 text-muted-foreground" />
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
                    <div className="p-3 rounded-full bg-primary/10">
                      <Wifi className="w-6 h-6 text-primary" />
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
                    <div className={`p-3 rounded-full ${offlineServices.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                      <WifiOff className={`w-6 h-6 ${offlineServices.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{offlineServices.length}</p>
                      <p className="text-sm text-muted-foreground">Servizi Offline</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prossime scadenze */}
            {expiringServices.length > 0 && (
              <Card className="border-amber-300 bg-amber-50/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-5 h-5" />
                    Servizi in scadenza nei prossimi 60 giorni
                  </CardTitle>
                  <CardDescription className="text-amber-800">
                    Puoi richiedere la disattivazione solo nell'ultimo mese prima della scadenza.
                    Superata la scadenza, il servizio viene rinnovato e potrai disdirlo nel mese
                    precedente al rinnovo successivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {expiringServices.map((service) => {
                    const days = daysUntilExpiration(service)!;
                    return (
                      <div
                        key={service.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{service.service_name}</p>
                          <p className="text-muted-foreground">
                            Scadenza {formatDate(service.expiration_date)} · fra {days}{" "}
                            {days === 1 ? "giorno" : "giorni"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {service.price ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayService(service);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <Euro className="w-4 h-4 mr-1" />
                              Paga {formatPrice(service.price)}
                            </Button>
                          ) : null}
                          {hasPendingCancellation(service.id) ? (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Disattivazione richiesta
                            </Badge>
                          ) : canRequestCancellation(service) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => openCancelModal(service)}
                            >
                              <Power className="w-4 h-4 mr-1" />
                              Disattiva
                            </Button>
                          ) : (
                            <Badge variant="outline">Disdetta non ancora disponibile</Badge>
                          )}
                        </div>
                      </div>

                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Services Table */}
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
                <Card className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servizio</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="hidden lg:table-cell">Dominio / Server</TableHead>
                        <TableHead className="hidden md:table-cell">Monitoraggio</TableHead>
                        <TableHead className="hidden md:table-cell">Scadenza</TableHead>
                        <TableHead className="hidden lg:table-cell">Ciclo</TableHead>
                        <TableHead className="text-right">Prezzo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => {
                        const config = serviceTypeConfig[service.service_type];
                        const statusConf = statusConfig[service.status];
                        const pendingCancellation = hasPendingCancellation(service.id);
                        const cancellable = canRequestCancellation(service);

                        return (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">
                              <div className="max-w-[200px] truncate">{service.service_name}</div>
                              {service.description && (
                                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {service.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{config.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              <div className="max-w-[180px] truncate">
                                {service.domain_name || service.server_name || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {service.status === "suspended" ? (
                                <span className="inline-flex items-center gap-1 text-destructive">
                                  <WifiOff className="w-4 h-4" /> Offline
                                </span>
                              ) : !service.url_to_monitor ? (
                                <span className="text-muted-foreground">-</span>
                              ) : service.is_online ? (
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Wifi className="w-4 h-4" /> Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-destructive">
                                  <WifiOff className="w-4 h-4" /> Offline
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {formatDate(service.expiration_date)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {billingCycleLabels[service.billing_cycle]}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatPrice(service.price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {pendingCancellation ? (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Richiesta inviata
                                </Badge>
                              ) : cancellable ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openCancelModal(service)}
                                  title="Richiedi disattivazione"
                                >
                                  <Power className="w-4 h-4" />
                                </Button>
                              ) : (
                                <span
                                  className="text-xs text-muted-foreground"
                                  title="La disdetta è possibile solo nell'ultimo mese prima della scadenza"
                                >
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>


            {/* Pending Payments Section */}
            {clientData && (
              <PendingPayments clientId={clientData.id} onPaymentComplete={fetchClientData} />
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {clientData && (
              <AnalyticsDashboard clientId={clientData.id} />
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            {clientData && (
              <MaintenanceHistory clientId={clientData.id} />
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            {clientData && <ClientInvoicesList clientId={clientData.id} />}
          </TabsContent>

        </Tabs>
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
              <p>La disdetta è possibile solo nell'ultimo mese prima della scadenza. Una volta elaborata la richiesta, il servizio non verrà rinnovato alla prossima scadenza; dopo il rinnovo potrai disdirlo di nuovo solo nel mese precedente alla scadenza successiva.</p>
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

      {/* Payment Dialog */}
      <ServicePaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        itemType="service"
        itemId={payService?.id ?? null}
        itemName={payService?.service_name ?? ""}
        amount={payService?.price ?? null}
        orderNumber={payService?.order_number ?? null}
        onCompleted={fetchClientData}
      />
    </div>
  );
}
