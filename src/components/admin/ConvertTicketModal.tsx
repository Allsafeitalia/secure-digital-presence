import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Server, Euro, ArrowRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type BillingCycle = Database["public"]["Enums"]["billing_cycle"];

interface ConvertTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketData: {
    id: string;
    name: string;
    email: string;
    message: string;
    subject: string;
  };
  onSuccess: () => void;
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

const requestTypeLabels: Record<string, string> = {
  maintenance: "Manutenzione",
  support: "Assistenza",
  update: "Aggiornamento",
  bug_fix: "Bug Fix",
};

const priorityLabels: Record<string, string> = {
  low: "Bassa",
  normal: "Normale",
  high: "Alta",
  urgent: "Urgente",
};

export const ConvertTicketModal = ({
  open,
  onOpenChange,
  ticketData,
  onSuccess,
}: ConvertTicketModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [conversionType, setConversionType] = useState<"helpdesk" | "service">("helpdesk");
  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [services, setServices] = useState<{ id: string; service_name: string; client_id: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  
  // Helpdesk form
  const [helpdeskData, setHelpdeskData] = useState({
    title: "",
    description: "",
    request_type: "support",
    priority: "normal",
    cost: "",
    service_id: "",
  });

  // Service form
  const [serviceData, setServiceData] = useState({
    service_type: "website" as ServiceType,
    service_name: "",
    description: "",
    billing_cycle: "yearly" as BillingCycle,
    price: "",
    expiration_date: "",
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchServices();
      // Pre-fill from ticket
      setHelpdeskData(prev => ({
        ...prev,
        title: ticketData.subject,
        description: ticketData.message,
      }));
      setServiceData(prev => ({
        ...prev,
        service_name: ticketData.subject,
        description: ticketData.message,
      }));
    }
  }, [open, ticketData]);

  useEffect(() => {
    // Auto-select client by email
    const matchingClient = clients.find(c => c.email.toLowerCase() === ticketData.email.toLowerCase());
    if (matchingClient) {
      setSelectedClientId(matchingClient.id);
    }
  }, [clients, ticketData.email]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name");
    setClients(data || []);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from("client_services")
      .select("id, service_name, client_id")
      .eq("status", "active")
      .order("service_name");
    setServices(data || []);
  };

  const filteredServices = selectedClientId
    ? services.filter(s => s.client_id === selectedClientId)
    : [];

  const handleConvert = async () => {
    if (!selectedClientId) {
      toast({
        title: "Errore",
        description: "Seleziona un cliente",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (conversionType === "helpdesk") {
        if (!helpdeskData.service_id || !helpdeskData.title) {
          toast({
            title: "Errore",
            description: "Compila tutti i campi obbligatori (Titolo e Servizio)",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.from("maintenance_requests").insert({
          client_id: selectedClientId,
          service_id: helpdeskData.service_id,
          title: helpdeskData.title,
          description: helpdeskData.description || null,
          request_type: helpdeskData.request_type,
          priority: helpdeskData.priority,
          status: "open",
          cost: helpdeskData.cost ? parseFloat(helpdeskData.cost) : null,
          payment_status: helpdeskData.cost ? "pending" : "pending",
        });

        if (error) throw error;

        toast({
          title: "Ticket convertito",
          description: "Il ticket è stato convertito in richiesta Helpdesk",
        });
      } else {
        if (!serviceData.service_name) {
          toast({
            title: "Errore",
            description: "Inserisci il nome del servizio",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.from("client_services").insert({
          client_id: selectedClientId,
          service_type: serviceData.service_type,
          service_name: serviceData.service_name,
          description: serviceData.description || null,
          billing_cycle: serviceData.billing_cycle,
          price: serviceData.price ? parseFloat(serviceData.price) : null,
          expiration_date: serviceData.expiration_date || null,
          status: "active",
          payment_status: serviceData.price ? "pending" : "pending",
        });

        if (error) throw error;

        toast({
          title: "Ticket convertito",
          description: "Il ticket è stato convertito in nuovo Servizio",
        });
      }

      // Close the ticket
      await supabase
        .from("contact_tickets")
        .update({ status: "closed" })
        .eq("id", ticketData.id);

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error converting ticket:", error);
      toast({
        title: "Errore",
        description: "Impossibile convertire il ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setConversionType("helpdesk");
    setSelectedClientId("");
    setHelpdeskData({
      title: "",
      description: "",
      request_type: "support",
      priority: "normal",
      cost: "",
      service_id: "",
    });
    setServiceData({
      service_type: "website",
      service_name: "",
      description: "",
      billing_cycle: "yearly",
      price: "",
      expiration_date: "",
    });
  };

  const matchingClient = clients.find(c => c.email.toLowerCase() === ticketData.email.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Converti Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conversion Type */}
          <div className="space-y-3">
            <Label>Converti in:</Label>
            <RadioGroup
              value={conversionType}
              onValueChange={(v) => setConversionType(v as "helpdesk" | "service")}
              className="grid grid-cols-2 gap-4"
            >
              <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                conversionType === "helpdesk" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}>
                <RadioGroupItem value="helpdesk" id="helpdesk" />
                <Label htmlFor="helpdesk" className="flex items-center gap-2 cursor-pointer">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="font-medium">Helpdesk</div>
                    <div className="text-xs text-muted-foreground">Assistenza / Manutenzione</div>
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                conversionType === "service" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}>
                <RadioGroupItem value="service" id="service" />
                <Label htmlFor="service" className="flex items-center gap-2 cursor-pointer">
                  <Server className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Servizio</div>
                    <div className="text-xs text-muted-foreground">Hosting / Dominio / etc.</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {matchingClient ? (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-sm text-green-600 font-medium">Cliente trovato automaticamente:</p>
                <p className="font-medium">{matchingClient.name}</p>
                <p className="text-sm text-muted-foreground">{matchingClient.email}</p>
              </div>
            ) : (
              <p className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 text-sm text-yellow-600">
                Nessun cliente trovato con email "{ticketData.email}". Selezionane uno:
              </p>
            )}
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Helpdesk Form */}
          {conversionType === "helpdesk" && (
            <div className="space-y-4 p-4 bg-orange-500/5 rounded-xl border border-orange-500/20">
              <div className="space-y-2">
                <Label>Servizio di riferimento *</Label>
                <Select 
                  value={helpdeskData.service_id} 
                  onValueChange={(v) => setHelpdeskData(prev => ({ ...prev, service_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredServices.length === 0 ? "Nessun servizio per questo cliente" : "Seleziona servizio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientId && filteredServices.length === 0 && (
                  <p className="text-xs text-yellow-600">
                    Questo cliente non ha servizi attivi. Prima crea un servizio.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Titolo *</Label>
                <Input
                  value={helpdeskData.title}
                  onChange={(e) => setHelpdeskData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titolo della richiesta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={helpdeskData.request_type} 
                    onValueChange={(v) => setHelpdeskData(prev => ({ ...prev, request_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(requestTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorità</Label>
                  <Select 
                    value={helpdeskData.priority} 
                    onValueChange={(v) => setHelpdeskData(prev => ({ ...prev, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Costo Intervento (€)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={helpdeskData.cost}
                  onChange={(e) => setHelpdeskData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={helpdeskData.description}
                  onChange={(e) => setHelpdeskData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Service Form */}
          {conversionType === "service" && (
            <div className="space-y-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Servizio *</Label>
                  <Select 
                    value={serviceData.service_type} 
                    onValueChange={(v) => setServiceData(prev => ({ ...prev, service_type: v as ServiceType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ciclo Fatturazione</Label>
                  <Select 
                    value={serviceData.billing_cycle} 
                    onValueChange={(v) => setServiceData(prev => ({ ...prev, billing_cycle: v as BillingCycle }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(billingCycleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome Servizio *</Label>
                <Input
                  value={serviceData.service_name}
                  onChange={(e) => setServiceData(prev => ({ ...prev, service_name: e.target.value }))}
                  placeholder="es. Hosting Sito Aziendale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Prezzo (€)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceData.price}
                    onChange={(e) => setServiceData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Scadenza</Label>
                  <Input
                    type="date"
                    value={serviceData.expiration_date}
                    onChange={(e) => setServiceData(prev => ({ ...prev, expiration_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={serviceData.description}
                  onChange={(e) => setServiceData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annulla
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? "Conversione..." : `Converti in ${conversionType === "helpdesk" ? "Helpdesk" : "Servizio"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
