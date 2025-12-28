import { useState } from "react";
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
import { Plus, Save, X, Server, Globe, HardDrive } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type BillingCycle = Database["public"]["Enums"]["billing_cycle"];
type ServiceStatus = Database["public"]["Enums"]["service_status"];

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
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

const statusLabels: Record<ServiceStatus, string> = {
  active: "Attivo",
  expiring_soon: "In scadenza",
  expired: "Scaduto",
  suspended: "Sospeso",
  cancelled: "Cancellato",
};

export const AddServiceModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: AddServiceModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_type: "website" as ServiceType,
    service_name: "",
    description: "",
    server_name: "",
    domain_name: "",
    expiration_date: "",
    billing_cycle: "yearly" as BillingCycle,
    status: "active" as ServiceStatus,
    price: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("client_services").insert({
        client_id: clientId,
        service_type: formData.service_type,
        service_name: formData.service_name,
        description: formData.description || null,
        server_name: formData.server_name || null,
        domain_name: formData.domain_name || null,
        expiration_date: formData.expiration_date || null,
        billing_cycle: formData.billing_cycle,
        status: formData.status,
        price: formData.price ? parseFloat(formData.price) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Servizio aggiunto",
        description: "Il servizio è stato aggiunto con successo",
      });

      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        service_type: "website",
        service_name: "",
        description: "",
        server_name: "",
        domain_name: "",
        expiration_date: "",
        billing_cycle: "yearly",
        status: "active",
        price: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il servizio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showServerField = formData.service_type === "backup" || formData.service_type === "hosting";
  const showDomainField = formData.service_type === "website" || formData.service_type === "domain" || formData.service_type === "hosting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Aggiungi Servizio - {clientName}
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
              {isLoading ? "Salvataggio..." : "Aggiungi Servizio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
