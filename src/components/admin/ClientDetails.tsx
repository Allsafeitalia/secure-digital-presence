import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Server,
  Globe,
  Euro,
  ArrowLeft,
  Edit,
  Power,
  KeyRound,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AddServiceModal } from "./AddServiceModal";
import { EditClientModal } from "./EditClientModal";
import { ClientInvoices } from "./ClientInvoices";
import { ClientAccounting } from "./ClientAccounting";
import type { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type BillingCycle = Database["public"]["Enums"]["billing_cycle"];
type ServiceStatus = Database["public"]["Enums"]["service_status"];

interface Client {
  id: string;
  ticket_id?: string | null;
  name: string;
  email: string;
  phone: string | null;
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_sdi: string | null;
  pec: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  is_active?: boolean;
}

interface ClientService {
  id: string;
  client_id: string;
  service_type: ServiceType;
  service_name: string;
  description: string | null;
  server_name: string | null;
  domain_name: string | null;
  url_to_monitor?: string | null;
  expiration_date: string | null;
  billing_cycle: BillingCycle;
  status: ServiceStatus;
  price: number | null;
  notes: string | null;
  created_at: string;
  payment_status?: string | null;
  order_number?: string | null;
  invoice_sent?: boolean | null;
  invoice_sent_at?: string | null;
}

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
  onClientUpdate?: (client: Client) => void;
  onClientDeleted?: () => void;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  website: "Sito Web",
  domain: "Dominio",
  hosting: "Hosting",
  backup: "Backup",
  email: "Email",
  ssl: "Certificato SSL",
  maintenance: "Manutenzione",
  other: "Altro",
};

const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  biannual: "Semestrale",
  yearly: "Annuale",
  one_time: "Una tantum",
};

const statusColors: Record<ServiceStatus, string> = {
  active: "bg-green-500/10 text-green-500",
  expiring_soon: "bg-yellow-500/10 text-yellow-500",
  expired: "bg-red-500/10 text-red-500",
  suspended: "bg-orange-500/10 text-orange-500",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<ServiceStatus, string> = {
  active: "Attivo",
  expiring_soon: "In scadenza",
  expired: "Scaduto",
  suspended: "Sospeso",
  cancelled: "Cancellato",
};

export const ClientDetails = ({ client: initialClient, onBack, onClientUpdate, onClientDeleted }: ClientDetailsProps) => {
  const { toast } = useToast();
  const [client, setClient] = useState(initialClient);
  const [services, setServices] = useState<ClientService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResendingCredentials, setIsResendingCredentials] = useState(false);
  const [invoicingServiceId, setInvoicingServiceId] = useState<string | null>(null);
  const [invoicesKey, setInvoicesKey] = useState(0);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  useEffect(() => {
    fetchServices();
  }, [client.id]);

  const statusOrder: Record<string, number> = {
    active: 0,
    expiring_soon: 1,
    pending: 2,
    suspended: 3,
    expired: 4,
    cancelled: 5,
  };

  const sortServices = (list: ClientService[]) =>
    [...list].sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      return diff !== 0 ? diff : a.service_name.localeCompare(b.service_name);
    });

  const fetchServices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("client_services")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i servizi",
        variant: "destructive",
      });
    } else {
      setServices(sortServices(data as ClientService[]));
    }
    setIsLoading(false);
  };

  const toggleClientActive = async () => {
    const newStatus = !client.is_active;
    const { error } = await supabase
      .from("clients")
      .update({ is_active: newStatus })
      .eq("id", client.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del cliente",
        variant: "destructive",
      });
    } else {
      const updatedClient = { ...client, is_active: newStatus };
      setClient(updatedClient);
      onClientUpdate?.(updatedClient);
      toast({
        title: newStatus ? "Cliente attivato" : "Cliente disattivato",
        description: `${client.name} è stato ${newStatus ? "attivato" : "disattivato"}`,
      });
    }
  };

  const toggleServiceStatus = async (service: ClientService) => {
    const newStatus: ServiceStatus = service.status === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("client_services")
      .update({ status: newStatus })
      .eq("id", service.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del servizio",
        variant: "destructive",
      });
    } else {
      toast({
        title: newStatus === "active" ? "Servizio attivato" : "Servizio sospeso",
        description: `${service.service_name} è stato ${newStatus === "active" ? "attivato" : "sospeso"}`,
      });
      fetchServices();
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;

    const { error } = await supabase
      .from("client_services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il servizio",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Servizio eliminato",
        description: "Il servizio è stato rimosso",
      });
      fetchServices();
    }
  };

  const invoiceService = async (service: ClientService) => {
    if (!service.price || Number(service.price) <= 0) {
      toast({
        title: "Prezzo mancante",
        description: "Imposta un prezzo sul servizio prima di fatturarlo",
        variant: "destructive",
      });
      return;
    }
    setInvoicingServiceId(service.id);
    try {
      const year = new Date().getFullYear();
      const { data: existing } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `%/${year}`);

      const next =
        (existing || []).reduce((max, row) => {
          const n = parseInt(String(row.invoice_number).split("/")[0], 10);
          return Number.isFinite(n) && n > max ? n : max;
        }, 0) + 1;
      const invoiceNumber = `${next}/${year}`;

      const { data: inserted, error } = await supabase
        .from("invoices")
        .insert({
          client_id: client.id,
          service_id: service.id,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().slice(0, 10),
          description: service.service_name,
          total_amount: Number(service.price),
          net_amount: Number(service.price),
          payment_status: service.payment_status === "paid" ? "paid" : "pending",
          payment_date:
            service.payment_status === "paid" ? new Date().toISOString().slice(0, 10) : null,
          payment_method: "Bonifico Bancario",
          notes: service.order_number ? `Ordine ${service.order_number}` : null,
        })
        .select("id")
        .single();

      if (error || !inserted) throw error || new Error("Insert fallita");

      const { data: ficData, error: ficError } = await supabase.functions.invoke("fattureincloud", {
        body: { action: "create_invoice", invoice_id: inserted.id },
      });

      await supabase
        .from("client_services")
        .update({ invoice_sent: true, invoice_sent_at: new Date().toISOString() })
        .eq("id", service.id);

      if (ficError || (ficData as any)?.error) {
        toast({
          title: `Fattura ${invoiceNumber} creata`,
          description:
            "Registrata nel gestionale, ma la creazione su Fatture in Cloud è fallita: " +
            ((ficData as any)?.error || ficError?.message || "errore sconosciuto"),
          variant: "destructive",
        });
      } else {
        toast({
          title: `Fattura ${invoiceNumber} emessa`,
          description: `${service.service_name} — creata anche su Fatture in Cloud`,
        });
      }

      fetchServices();
      setInvoicesKey((k) => k + 1);
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e?.message || "Impossibile creare la fattura",
        variant: "destructive",
      });
    } finally {
      setInvoicingServiceId(null);
    }
  };

  const toggleInvoiceSent = async (service: ClientService) => {

    const sent = !service.invoice_sent;
    const { error } = await supabase
      .from("client_services")
      .update({ invoice_sent: sent, invoice_sent_at: sent ? new Date().toISOString() : null })
      .eq("id", service.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare la fattura", variant: "destructive" });
      return;
    }
    toast({
      title: sent ? "Fattura segnata come inviata" : "Fattura da inviare",
      description: service.service_name,
    });
    fetchServices();
  };

  const toggleServicePaid = async (service: ClientService) => {
    const paid = service.payment_status !== "paid";
    const { error } = await supabase
      .from("client_services")
      .update({
        payment_status: paid ? "paid" : "pending",
        payment_date: paid ? new Date().toISOString() : null,
      })
      .eq("id", service.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare il pagamento", variant: "destructive" });
      return;
    }
    toast({
      title: paid ? "Servizio segnato come pagato" : "Servizio segnato da pagare",
      description: service.service_name,
    });
    fetchServices();
  };


  const handleClientUpdate = (updatedClient: Client) => {
    setClient(updatedClient);
    onClientUpdate?.(updatedClient);
  };

  const deleteClient = async () => {
    setIsDeleting(true);
    
    // First delete all services associated with this client
    const { error: servicesError } = await supabase
      .from("client_services")
      .delete()
      .eq("client_id", client.id);

    if (servicesError) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare i servizi del cliente",
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    // Then delete the client
    const { error: clientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (clientError) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il cliente",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato rimosso con successo",
      });
      onClientDeleted?.();
    }
    
    setIsDeleting(false);
  };

  const resendCredentials = async () => {
    setIsResendingCredentials(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error("Sessione scaduta. Effettua nuovamente l'accesso e riprova.");
      }

      // Refresh and use the freshest access token explicitly (avoids gateway JWT issues)
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn("Unable to refresh session before invoking function:", refreshError);
      }
      const accessToken = refreshData?.session?.access_token ?? session.access_token;

      const { data, error } = await supabase.functions.invoke("resend-credentials", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          clientId: client.id,
          email: client.email,
          name: client.name,
        },
      });


      if (error) throw error;

      if (data?.userExists) {
        toast({
          title: "Recupero password inviato",
          description: `Email inviata a ${client.email} per reimpostare la password.`,
        });
      } else {
        toast({
          title: "Invito inviato",
          description: `Email di invito inviata a ${client.email}`,
        });
      }
    } catch (error: any) {
      console.error("Error resending credentials:", error);

      let description = "Impossibile inviare le credenziali";

      try {
        const ctx: any = error?.context;
        const resp: Response | undefined =
          typeof Response !== "undefined" && ctx instanceof Response
            ? ctx
            : typeof Response !== "undefined" && ctx?.response instanceof Response
              ? ctx.response
              : undefined;

        if (resp) {
          const status = resp.status;
          const text = await resp.clone().text();

          if (text) {
            try {
              const json = JSON.parse(text);
              const msg = json?.error || json?.message || text;
              description = `${msg} (HTTP ${status})`;
            } catch {
              description = `${text} (HTTP ${status})`;
            }
          } else {
            description = `${description} (HTTP ${status})`;
          }
        } else if (error?.message) {
          description = error.message;
        }
      } catch {
        // ignore parsing errors
      }

      toast({
        title: "Errore",
        description,
        variant: "destructive",
      });
    } finally {
      setIsResendingCredentials(false);
    }
  };

  const toInvoice = services.filter((s) => s.payment_status !== "paid" && !s.invoice_sent);

  const fullAddress = [

    client.address,
    client.city,
    client.province,
    client.postal_code,
    client.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-4 md:p-8 max-w-[1400px] w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </Button>
        <div className="flex items-center gap-2">
          {/* Resend Credentials Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isResendingCredentials}
              >
                {isResendingCredentials ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-1">Invia Invito</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Inviare invito?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verrà inviata un'email a <strong>{client.email}</strong> con un link per impostare la propria password.
                  {" "}Se il cliente ha già un account, verrà informato di usare la funzione "Password dimenticata".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={resendCredentials}>
                  Invia Invito
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" size="sm" onClick={() => setShowEditClient(true)}>
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Modifica</span>
          </Button>
          
          {/* Delete button - only visible when client is deactivated */}
          {client.is_active === false && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Elimina</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione è irreversibile. Verranno eliminati permanentemente il cliente 
                    <strong> {client.name}</strong> e tutti i suoi {services.length} servizi associati.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteClient}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ${client.is_active !== false ? 'bg-primary/10' : 'bg-muted'}`}>
            <Building2 className={`w-6 h-6 md:w-8 md:h-8 ${client.is_active !== false ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl md:text-2xl font-bold truncate">{client.name}</h2>
              {client.is_active === false && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                  Disattivato
                </Badge>
              )}
            </div>
            {client.ragione_sociale && (
              <p className="text-muted-foreground text-sm md:text-base truncate">{client.ragione_sociale}</p>
            )}
            <p className="text-xs md:text-sm text-muted-foreground">
              Cliente dal{" "}
              {format(new Date(client.created_at), "dd MMM yyyy", {
                locale: it,
              })}
            </p>
          </div>
        </div>
        
        {/* Toggle client active */}
        <div className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
          <Power className={`w-4 h-4 ${client.is_active !== false ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">{client.is_active !== false ? 'Attivo' : 'Disattivato'}</span>
          <Switch
            checked={client.is_active !== false}
            onCheckedChange={toggleClientActive}
          />
        </div>
      </div>

      {/* Client Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
            <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Email
          </div>
          <a href={`mailto:${client.email}`} className="text-primary hover:underline text-sm md:text-base block truncate">
            {client.email}
          </a>
          {client.pec && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">PEC: {client.pec}</p>
          )}
        </div>

        {client.phone && (
          <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Telefono
            </div>
            <a
              href={`tel:${client.phone}`}
              className="font-medium hover:text-primary text-sm md:text-base"
            >
              {client.phone}
            </a>
          </div>
        )}

        {client.partita_iva && (
          <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
              P.IVA / SDI
            </div>
            <p className="font-medium text-sm md:text-base truncate">{client.partita_iva}</p>
            {client.codice_sdi && (
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                SDI: {client.codice_sdi}
              </p>
            )}
          </div>
        )}

        {fullAddress && (
          <div className="bg-secondary/30 rounded-xl p-3 md:p-4 col-span-2">
            <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Indirizzo
            </div>
            <p className="font-medium text-sm md:text-base">{fullAddress}</p>
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
          <h3 className="font-display font-bold text-base md:text-lg">Servizi Attivi</h3>
          <Button size="sm" onClick={() => setShowAddService(true)} className="text-xs md:text-sm">
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Aggiungi</span> Servizio
          </Button>
        </div>

        {toInvoice.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 md:p-4">
            <p className="font-medium text-amber-900 text-sm md:text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Fatture da inviare ({toInvoice.length})
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {toInvoice.map((s) => (
                <li key={s.id}>
                  {s.service_name}
                  {s.price ? ` — € ${Number(s.price).toFixed(2)}` : ""}
                  {s.order_number ? ` · Ordine ${s.order_number}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}


        {isLoading ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">
            Caricamento servizi...
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">
            <Server className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm md:text-base">Nessun servizio registrato</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs md:text-sm"
              onClick={() => setShowAddService(true)}
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Aggiungi il primo servizio
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servizio</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="hidden lg:table-cell">Dominio / Server</TableHead>
                  <TableHead className="hidden md:table-cell">Scadenza</TableHead>
                  <TableHead className="hidden lg:table-cell">Ciclo</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                  <TableHead>Fatturazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow
                    key={service.id}
                    className={service.status === "suspended" || service.status === "cancelled" ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[340px]">{service.service_name}</div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[340px]">
                          {service.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px] md:text-xs">
                        {serviceTypeLabels[service.service_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] md:text-xs ${statusColors[service.status]}`}>
                        {statusLabels[service.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div className="truncate max-w-[300px]">
                        {service.domain_name || service.server_name || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {service.expiration_date
                        ? format(new Date(service.expiration_date), "dd/MM/yy")
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {billingCycleLabels[service.billing_cycle]}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {service.price ? `€ ${service.price.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={
                              service.invoice_sent
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] md:text-xs"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] md:text-xs"
                            }
                          >
                            {service.invoice_sent ? "Fattura inviata" : "Fattura da inviare"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              service.payment_status === "paid"
                                ? "bg-green-500/10 text-green-600 border-green-500/20 text-[10px] md:text-xs"
                                : "bg-red-500/10 text-red-600 border-red-500/20 text-[10px] md:text-xs"
                            }
                          >
                            {service.payment_status === "paid" ? "Pagato" : "Da pagare"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => toggleInvoiceSent(service)}
                          >
                            {service.invoice_sent ? "Segna non inviata" : "Segna inviata"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => toggleServicePaid(service)}
                          >
                            {service.payment_status === "paid" ? "Segna da pagare" : "Segna pagato"}
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>

                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={service.status === "active"}
                          onCheckedChange={() => toggleServiceStatus(service)}
                          className="scale-90"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => setEditingService(service)}
                          title="Modifica servizio"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive p-2"
                          onClick={() => deleteService(service.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      </div>

      {/* Accounting */}
      <ClientAccounting clientId={client.id} />

      {/* Invoices */}
      <ClientInvoices
        key={invoicesKey}
        clientId={client.id}
        services={services.map((s) => ({ id: s.id, service_name: s.service_name }))}
      />


      {/* Notes */}
      {client.notes && (
        <div className="mt-4 md:mt-6 bg-secondary/30 rounded-xl p-3 md:p-4">
          <h4 className="font-medium mb-2 text-sm md:text-base">Note</h4>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm md:text-base">
            {client.notes}
          </p>
        </div>
      )}

      <AddServiceModal
        open={showAddService}
        onOpenChange={setShowAddService}
        clientId={client.id}
        clientName={client.name}
        onSuccess={fetchServices}
      />

      <AddServiceModal
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        clientId={client.id}
        clientName={client.name}
        service={editingService}
        onSuccess={fetchServices}
      />

      <EditClientModal
        open={showEditClient}
        onOpenChange={setShowEditClient}
        client={client}
        onSuccess={handleClientUpdate}
      />
    </div>
  );
};
