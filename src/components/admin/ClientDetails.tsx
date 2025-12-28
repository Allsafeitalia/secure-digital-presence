import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  expiration_date: string | null;
  billing_cycle: BillingCycle;
  status: ServiceStatus;
  price: number | null;
  notes: string | null;
  created_at: string;
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
  const [showEditClient, setShowEditClient] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResendingCredentials, setIsResendingCredentials] = useState(false);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  useEffect(() => {
    fetchServices();
  }, [client.id]);

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
      setServices(data as ClientService[]);
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
      if (!session?.access_token) {
        throw new Error("Sessione non valida. Effettua nuovamente l'accesso e riprova.");
      }

      const { data, error } = await supabase.functions.invoke("resend-credentials", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          clientId: client.id,
          email: client.email,
          name: client.name,
        },
      });

      if (error) throw error;

      toast({
        title: "Credenziali inviate",
        description: `Nuove credenziali inviate a ${client.email}`,
      });
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
    }
    
    setIsResendingCredentials(false);
  };

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
    <div className="p-4 md:p-8 max-w-4xl w-full">
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
                  <KeyRound className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-1">Reinvia Credenziali</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reinviare le credenziali?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verrà generata una nuova password temporanea e inviata a <strong>{client.email}</strong>. 
                  La vecchia password non sarà più valida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={resendCredentials}>
                  Invia Nuove Credenziali
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
          <div className="space-y-3 md:space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-secondary/30 rounded-xl p-3 md:p-4 flex items-start justify-between gap-2 md:gap-4 ${service.status === 'suspended' || service.status === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mb-2">
                    <span className="font-medium text-sm md:text-base truncate">{service.service_name}</span>
                    <Badge variant="outline" className="text-[10px] md:text-xs">
                      {serviceTypeLabels[service.service_type]}
                    </Badge>
                    <Badge className={`text-[10px] md:text-xs ${statusColors[service.status]}`}>
                      {statusLabels[service.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                    {service.domain_name && (
                      <div className="flex items-center gap-1 truncate">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{service.domain_name}</span>
                      </div>
                    )}
                    {service.server_name && (
                      <div className="flex items-center gap-1 truncate">
                        <Server className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{service.server_name}</span>
                      </div>
                    )}
                    {service.expiration_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {format(new Date(service.expiration_date), "dd/MM/yy")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {billingCycleLabels[service.billing_cycle]}
                    </div>
                    {service.price && (
                      <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3 flex-shrink-0" />
                        {service.price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {service.description && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-2 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Switch
                    checked={service.status === "active"}
                    onCheckedChange={() => toggleServiceStatus(service)}
                    className="scale-90"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive p-2"
                    onClick={() => deleteService(service.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      <EditClientModal
        open={showEditClient}
        onOpenChange={setShowEditClient}
        client={client}
        onSuccess={handleClientUpdate}
      />
    </div>
  );
};
