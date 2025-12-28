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
import { Building2, FileText, MapPin, Save, X } from "lucide-react";

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketData?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  onSuccess: () => void;
}

export const CreateClientModal = ({
  open,
  onOpenChange,
  ticketData,
  onSuccess,
}: CreateClientModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: ticketData?.name || "",
    email: ticketData?.email || "",
    phone: ticketData?.phone || "",
    ragione_sociale: "",
    partita_iva: "",
    codice_sdi: "",
    pec: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "Italia",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First create the client record
      const { data: clientData, error } = await supabase.from("clients").insert({
        ticket_id: ticketData?.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        ragione_sociale: formData.ragione_sociale || null,
        partita_iva: formData.partita_iva || null,
        codice_sdi: formData.codice_sdi || null,
        pec: formData.pec || null,
        address: formData.address || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        country: formData.country,
        notes: formData.notes || null,
      }).select().single();

      if (error) throw error;

      // Now create the auth account and send email
      const { data: accountData, error: accountError } = await supabase.functions.invoke(
        "create-client-account",
        {
          body: {
            clientId: clientData.id,
            email: formData.email,
            name: formData.name,
          },
        }
      );

      if (accountError) {
        console.error("Error creating account:", accountError);
        toast({
          title: "Cliente creato",
          description: "Il cliente è stato registrato, ma non è stato possibile creare l'account di accesso. Prova a ricreare l'account manualmente.",
          variant: "default",
        });
      } else {
        toast({
          title: "Cliente creato",
          description: "Il cliente è stato registrato e ha ricevuto le credenziali via email",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare il cliente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Registra Nuovo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Informazioni Personali
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pec">PEC</Label>
                <Input
                  id="pec"
                  type="email"
                  value={formData.pec}
                  onChange={(e) => handleChange("pec", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dati Aziendali
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ragione_sociale">Ragione Sociale</Label>
                <Input
                  id="ragione_sociale"
                  value={formData.ragione_sociale}
                  onChange={(e) => handleChange("ragione_sociale", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partita_iva">Partita IVA</Label>
                <Input
                  id="partita_iva"
                  value={formData.partita_iva}
                  onChange={(e) => handleChange("partita_iva", e.target.value)}
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codice_sdi">Codice SDI</Label>
                <Input
                  id="codice_sdi"
                  value={formData.codice_sdi}
                  onChange={(e) => handleChange("codice_sdi", e.target.value)}
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Indirizzo
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Via/Piazza, numero civico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => handleChange("province", e.target.value)}
                    maxLength={2}
                    placeholder="es. MI"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">CAP</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                    maxLength={5}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Paese</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
            />
          </div>

          {/* Actions */}
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
              {isLoading ? "Salvataggio..." : "Salva Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
