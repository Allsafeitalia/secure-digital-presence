import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, X, Server, Globe, HardDrive, Activity, Pencil } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type BillingCycle = Database["public"]["Enums"]["billing_cycle"];
type ServiceStatus = Database["public"]["Enums"]["service_status"];

export interface EditableService {
  id: string;
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
}

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
  /** Se presente, il modale funziona in modalita modifica */
  service?: EditableService | null;
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

const statusLabels: Record<ServiceStatus, string> = {
  active: "Attivo",
  expiring_soon: "In scadenza",
  expired: "Scaduto",
  suspended: "Sospeso",
  cancelled: "Cancellato",
};

const emptyForm = {
    service_type: "website" as ServiceType,
    service_name: "",
    description: "",
    server_name: "",
    domain_name: "",
    url_to_monitor: "",
    expiration_date: "",
    billing_cycle: "yearly" as BillingCycle,
    status: "active" as ServiceStatus,
    price: "",
    notes: "",
  };

export const AddServiceModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
  service = null,
}: AddServiceModalProps) => {
  const isEditMode = !!service;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (service) {
      setFormData({
        service_type: service.service_type,
        service_name: service.service_name,
        description: service.description ?? "",
        server_name: service.server_name ?? "",
        domain_name: service.domain_name ?? "",
        url_to_monitor: service.url_to_monitor ?? "",
        expiration_date: service.expiration_date ?? "",
        billing_cycle: service.billing_cycle,
        status: service.status,
        price: service.price !== null && service.price !== undefined ? String(service.price) : "",
        notes: service.notes ?? "",
      });
    } else {
      setFormData(emptyForm);
    }
  }, [open, service]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        service_type: formData.service_type,
        service_name: formData.service_name,
        description: formData.description || null,
        server_name: formData.server_name || null,
        domain_name: formData.domain_name || null,
        url_to_monitor: formData.url_to_monitor || null,
        expiration_date: formData.expiration_date || null,
        billing_cycle: formData.billing_cycle,
        status: formData.status,
        price: formData.price ? parseFloat(formData.price) : null,
        notes: formData.notes || null,
      };

      const { error } = isEditMode
        ? await supabase.from("client_services").update(payload).eq("id", service!.id)
        : await supabase.from("client_services").insert({ client_id: clientId, ...payload });

      if (error) throw error;

      toast({
        title: isEditMode ? "Servizio aggiornato" : "Servizio aggiunto",
        description: isEditMode
          ? "Le modifiche sono state salvate"
          : "Il servizio è stato aggiunto con successo",
      });

      onSuccess();
      onOpenChange(false);
      if (!isEditMode) setFormData(emptyForm);
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Errore",
        description: isEditMode
          ? "Impossibile aggiornare il servizio"
          : "Impossibile aggiungere il servizio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showServerField = formData.service_type === "backup" || formData.service_type === "hosting";
  const showDomainField = formData.service_type === "website" || formData.service_type === "domain" || formData.service_type === "hosting";
  // Show monitor field for ALL service types
  const showMonitorField = true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEditMode ? "Modifica Servizio" : "Aggiungi Servizio"} - {clientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_type">Tipo Servizio *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => handleChange("service_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(serviceTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_name">Nome Servizio *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => handleChange("service_name", e.target.value)}
                placeholder="es. Sito Aziendale"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Breve descrizione del servizio"
            />
          </div>

          {showDomainField && (
            <div className="space-y-2">
              <Label htmlFor="domain_name" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Dominio
              </Label>
              <Input
                id="domain_name"
                value={formData.domain_name}
                onChange={(e) => handleChange("domain_name", e.target.value)}
                placeholder="es. esempio.it"
              />
            </div>
          )}

          {showServerField && (
            <div className="space-y-2">
              <Label htmlFor="server_name" className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Nome Server
              </Label>
              <Input
                id="server_name"
                value={formData.server_name}
                onChange={(e) => handleChange("server_name", e.target.value)}
                placeholder="es. server-backup-01"
              />
            </div>
          )}

          {showMonitorField && (
            <div className="space-y-2">
              <Label htmlFor="url_to_monitor" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                URL da Monitorare
              </Label>
              <Input
                id="url_to_monitor"
                value={formData.url_to_monitor}
                onChange={(e) => handleChange("url_to_monitor", e.target.value)}
                placeholder="es. https://esempio.it"
              />
              <p className="text-xs text-muted-foreground">
                Il sistema controllerà automaticamente se questo URL è raggiungibile
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Ciclo di Fatturazione</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => handleChange("billing_cycle", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(billingCycleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Data Scadenza</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => handleChange("expiration_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Stato</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prezzo (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Note aggiuntive..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4" />
              {isLoading ? "Salvataggio..." : isEditMode ? "Salva Modifiche" : "Aggiungi Servizio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
