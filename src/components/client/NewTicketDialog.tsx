import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

interface NewTicketDialogProps {
  clientId: string;
  onCreated?: () => void;
}

interface ServiceOption {
  id: string;
  service_name: string;
}

export function NewTicketDialog({ clientId, onCreated }: NewTicketDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [requestType, setRequestType] = useState("support");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("client_services")
      .select("id, service_name")
      .eq("client_id", clientId)
      .order("service_name")
      .then(({ data }) => setServices(data || []));
  }, [open, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !title.trim()) {
      toast({
        title: "Dati mancanti",
        description: "Seleziona il servizio e indica un titolo",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("maintenance_requests").insert({
        client_id: clientId,
        service_id: serviceId,
        title: title.trim(),
        description: description.trim() || null,
        request_type: requestType,
        priority,
        status: "open",
        payment_status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Ticket aperto",
        description: "Riceverai un preventivo con il costo dell'intervento, poi potrai pagare con PayPal o bonifico.",
      });
      setTitle("");
      setDescription("");
      setServiceId("");
      setOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aprire il ticket",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Apri Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova richiesta di assistenza</DialogTitle>
          <DialogDescription>
            Descrivi il problema o l'intervento richiesto. Ti comunicheremo il costo prima di procedere.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Servizio interessato</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un servizio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.service_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Assistenza</SelectItem>
                  <SelectItem value="maintenance">Manutenzione</SelectItem>
                  <SelectItem value="emergency">Emergenza</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorità</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-title">Titolo</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Sito non raggiungibile"
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-desc">Descrizione</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi il problema nel dettaglio"
              rows={4}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Invia richiesta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
