import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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
  is_active?: boolean;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSuccess: (updatedClient: Client) => void;
}

export const EditClientModal = ({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    ragione_sociale: "",
    partita_iva: "",
    codice_sdi: "",
    pec: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    notes: "",
  });

  useEffect(() => {
    if (client && open) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        ragione_sociale: client.ragione_sociale || "",
        partita_iva: client.partita_iva || "",
        codice_sdi: client.codice_sdi || "",
        pec: client.pec || "",
        address: client.address || "",
        city: client.city || "",
        province: client.province || "",
        postal_code: client.postal_code || "",
        country: client.country || "",
        notes: client.notes || "",
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .update({
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
        country: formData.country || null,
        notes: formData.notes || null,
      })
      .eq("id", client.id)
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il cliente",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente aggiornato",
        description: "I dati sono stati salvati con successo",
      });
      onSuccess(data as Client);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pec">PEC</Label>
              <Input
                id="pec"
                type="email"
                value={formData.pec}
                onChange={(e) =>
                  setFormData({ ...formData, pec: e.target.value })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 text-sm">Dati Fiscali</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ragione_sociale">Ragione Sociale</Label>
                <Input
                  id="ragione_sociale"
                  value={formData.ragione_sociale}
                  onChange={(e) =>
                    setFormData({ ...formData, ragione_sociale: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partita_iva">Partita IVA</Label>
                <Input
                  id="partita_iva"
                  value={formData.partita_iva}
                  onChange={(e) =>
                    setFormData({ ...formData, partita_iva: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codice_sdi">Codice SDI</Label>
                <Input
                  id="codice_sdi"
                  value={formData.codice_sdi}
                  onChange={(e) =>
                    setFormData({ ...formData, codice_sdi: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 text-sm">Indirizzo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Via/Indirizzo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) =>
                    setFormData({ ...formData, province: e.target.value })
                  }
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CAP</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Paese</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salva Modifiche
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
