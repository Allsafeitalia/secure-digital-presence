import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AddServiceModal } from "./AddServiceModal";
import type { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type BillingCycle = Database["public"]["Enums"]["billing_cycle"];
type ServiceStatus = Database["public"]["Enums"]["service_status"];

interface Client {
  id: string;
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

export const ClientDetails = ({ client, onBack }: ClientDetailsProps) => {
  const { toast } = useToast();
  const [services, setServices] = useState<ClientService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);

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
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </Button>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">{client.name}</h2>
            {client.ragione_sociale && (
              <p className="text-muted-foreground">{client.ragione_sociale}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Cliente dal{" "}
              {format(new Date(client.created_at), "dd MMMM yyyy", {
                locale: it,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Client Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-secondary/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Mail className="w-4 h-4" />
            Email
          </div>
          <a href={`mailto:${client.email}`} className="text-primary hover:underline">
            {client.email}
          </a>
          {client.pec && (
            <p className="text-sm text-muted-foreground mt-1">PEC: {client.pec}</p>
          )}
        </div>

        {client.phone && (
          <div className="bg-secondary/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Phone className="w-4 h-4" />
              Telefono
            </div>
            <a
              href={`tel:${client.phone}`}
              className="font-medium hover:text-primary"
            >
              {client.phone}
            </a>
          </div>
        )}

        {client.partita_iva && (
          <div className="bg-secondary/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <FileText className="w-4 h-4" />
              P.IVA / SDI
            </div>
            <p className="font-medium">{client.partita_iva}</p>
            {client.codice_sdi && (
              <p className="text-sm text-muted-foreground">
                SDI: {client.codice_sdi}
              </p>
            )}
          </div>
        )}

        {fullAddress && (
          <div className="bg-secondary/30 rounded-xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MapPin className="w-4 h-4" />
              Indirizzo
            </div>
            <p className="font-medium">{fullAddress}</p>
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-lg">Servizi Attivi</h3>
          <Button size="sm" onClick={() => setShowAddService(true)}>
            <Plus className="w-4 h-4" />
            Aggiungi Servizio
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento servizi...
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nessun servizio registrato</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowAddService(true)}
            >
              <Plus className="w-4 h-4" />
              Aggiungi il primo servizio
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-secondary/30 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">{service.service_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {serviceTypeLabels[service.service_type]}
                    </Badge>
                    <Badge className={`text-xs ${statusColors[service.status]}`}>
                      {statusLabels[service.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    {service.domain_name && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {service.domain_name}
                      </div>
                    )}
                    {service.server_name && (
                      <div className="flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        {service.server_name}
                      </div>
                    )}
                    {service.expiration_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Scade:{" "}
                        {format(new Date(service.expiration_date), "dd/MM/yyyy")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {billingCycleLabels[service.billing_cycle]}
                    </div>
                    {service.price && (
                      <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        {service.price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {service.description}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteService(service.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="mt-6 bg-secondary/30 rounded-xl p-4">
          <h4 className="font-medium mb-2">Note</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">
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
    </div>
  );
};
