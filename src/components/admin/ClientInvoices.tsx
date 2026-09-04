import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  description: string | null;
  total_amount: number;
  payment_status: string;
  payment_date: string | null;
  payment_method: string | null;
  service_id: string | null;
  notes: string | null;
}


interface ServiceOption {
  id: string;
  service_name: string;
}

interface ClientInvoicesProps {
  clientId: string;
  services: ServiceOption[];
  onChange?: () => void;
}

const emptyForm = {
  invoice_number: "",
  invoice_date: new Date().toISOString().slice(0, 10),
  description: "",
  total_amount: "",
  payment_status: "pending",
  payment_date: "",
  payment_method: "Bonifico Bancario",
  service_id: "none",
  notes: "",
};

export const ClientInvoices = ({ clientId, services, onChange }: ClientInvoicesProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchInvoices = async () => {

    setIsLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
    } else {
      setInvoices((data as Invoice[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from("invoices").insert({
      client_id: clientId,
      service_id: form.service_id === "none" ? null : form.service_id,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date,
      description: form.description || null,
      total_amount: parseFloat(form.total_amount || "0"),
      net_amount: parseFloat(form.total_amount || "0"),
      payment_status: form.payment_status,
      payment_date: form.payment_status === "paid" && form.payment_date ? form.payment_date : null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    });
    setIsSaving(false);

    if (error) {
      toast({ title: "Errore", description: "Impossibile salvare la fattura", variant: "destructive" });
      return;
    }
    toast({ title: "Fattura aggiunta", description: `Fattura ${form.invoice_number} registrata` });
    setForm(emptyForm);
    setShowAdd(false);
    fetchInvoices();
    onChange?.();
  };

  const togglePaid = async (invoice: Invoice) => {
    const paid = invoice.payment_status !== "paid";
    const { error } = await supabase
      .from("invoices")
      .update({
        payment_status: paid ? "paid" : "pending",
        payment_date: paid ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", invoice.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare la fattura", variant: "destructive" });
      return;
    }
    fetchInvoices();
    onChange?.();
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare la fattura", variant: "destructive" });
      return;
    }
    fetchInvoices();
    onChange?.();
  };

  const total = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Fatture ({invoices.length}) — totale € {total.toFixed(2)}
        </h4>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          Aggiungi Fattura
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna fattura registrata</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-start justify-between gap-3 bg-secondary/30 rounded-xl p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Fattura {inv.invoice_number}</span>
                  <Badge
                    variant="outline"
                    className={
                      inv.payment_status === "paid"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }
                  >
                    {inv.payment_status === "paid" ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {inv.payment_status === "paid" ? "Pagata" : "Da pagare"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {format(new Date(inv.invoice_date), "dd MMM yyyy", { locale: it })}
                  {inv.description ? ` · ${inv.description}` : ""}
                </p>
                {inv.payment_date && (
                  <p className="text-xs text-muted-foreground">
                    Saldata il {format(new Date(inv.payment_date), "dd/MM/yyyy")}
                    {inv.payment_method ? ` · ${inv.payment_method}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-semibold">€ {Number(inv.total_amount).toFixed(2)}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => togglePaid(inv)}>
                    {inv.payment_status === "paid" ? "Segna da pagare" : "Segna pagata"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteInvoice(inv.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Fattura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Numero *</Label>
                <Input
                  id="invoice_number"
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  placeholder="es. 15/2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Data *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Importo (€) *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Servizio collegato</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(v) => setForm({ ...form, service_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stato pagamento</Label>
                <Select
                  value={form.payment_status}
                  onValueChange={(v) => setForm({ ...form, payment_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Da pagare</SelectItem>
                    <SelectItem value="paid">Pagata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Data pagamento</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  disabled={form.payment_status !== "paid"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvataggio..." : "Salva Fattura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
