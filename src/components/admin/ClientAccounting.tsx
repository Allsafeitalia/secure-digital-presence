import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Euro, Receipt, Wrench, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  total_amount: number | null;
  payment_status: string;
}

interface AccountingService {
  id: string;
  service_name: string;
  status: string;
  price: number | null;
  created_at: string;
  expiration_date: string | null;
  billing_cycle: string;
}

interface MaintenanceItem {
  title: string;
  cost: number | null;
  status: string;
  created_at: string;
}

interface ClientAccountingProps {
  clientId: string;
}

const statusLabels: Record<string, string> = {
  active: "Attivo",
  expiring_soon: "In scadenza",
  expired: "Scaduto",
  suspended: "Sospeso",
  cancelled: "Cancellato",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  expiring_soon: "bg-yellow-500/10 text-yellow-600",
  expired: "bg-red-500/10 text-red-600",
  suspended: "bg-orange-500/10 text-orange-600",
  cancelled: "bg-muted text-muted-foreground",
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export const ClientAccounting = ({ clientId }: ClientAccountingProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<AccountingService[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [inv, srv, mnt] = await Promise.all([
        supabase
          .from("invoices")
          .select("invoice_number, invoice_date, total_amount, payment_status")
          .eq("client_id", clientId),
        supabase
          .from("client_services")
          .select("id, service_name, status, price, created_at, expiration_date, billing_cycle")
          .eq("client_id", clientId),
        supabase
          .from("maintenance_requests")
          .select("title, cost, status, created_at")
          .eq("client_id", clientId),
      ]);
      setInvoices((inv.data as Invoice[]) || []);
      setServices((srv.data as AccountingService[]) || []);
      setMaintenance((mnt.data as MaintenanceItem[]) || []);
      setIsLoading(false);
    };
    load();
  }, [clientId]);

  const years = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => i.invoice_date && set.add(i.invoice_date.slice(0, 4)));
    maintenance.forEach((m) => set.add(m.created_at.slice(0, 4)));
    services.forEach((s) => set.add(s.created_at.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [invoices, maintenance, services]);

  const range = useMemo(() => {
    if (period === "all") return { from: null as string | null, to: null as string | null };
    if (period === "custom")
      return { from: customFrom || null, to: customTo || null };
    return { from: `${period}-01-01`, to: `${period}-12-31` };
  }, [period, customFrom, customTo]);

  const inRange = (date: string | null) => {
    if (!date) return false;
    const d = date.slice(0, 10);
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  };

  const periodInvoices = invoices.filter((i) => inRange(i.invoice_date));
  const periodMaintenance = maintenance.filter((m) => inRange(m.created_at));

  const invoiced = periodInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const invoicedPaid = periodInvoices
    .filter((i) => i.payment_status === "paid")
    .reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const invoicedPending = invoiced - invoicedPaid;
  const maintenanceCost = periodMaintenance.reduce((s, m) => s + Number(m.cost || 0), 0);
  const totalPeriod = invoiced + maintenanceCost;

  const totalEver =
    invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0) +
    maintenance.reduce((s, m) => s + Number(m.cost || 0), 0);

  // Servizi attivi nel periodo selezionato (creati prima della fine periodo e non scaduti prima dell'inizio)
  const servicesInPeriod = services.filter((s) => {
    if (period === "all") return true;
    const start = s.created_at.slice(0, 10);
    const end = s.expiration_date ? s.expiration_date.slice(0, 10) : "9999-12-31";
    if (range.to && start > range.to) return false;
    if (range.from && end < range.from) return false;
    return true;
  });

  const activeServices = services.filter((s) => s.status === "active");
  const inactiveServices = services.filter((s) => s.status !== "active");
  const recurringValue = activeServices.reduce((s, x) => s + Number(x.price || 0), 0);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 text-muted-foreground text-sm">
        Caricamento situazione contabile...
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 mt-4 md:mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
          <Calculator className="w-4 h-4 md:w-5 md:h-5" />
          Situazione Contabile
        </h3>

        <div className="flex flex-wrap items-end gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Da sempre</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  Anno {y}
                </SelectItem>
              ))}
              <SelectItem value="custom">Periodo personalizzato</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Dal</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Al</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Riepilogo periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Euro className="w-3.5 h-3.5" /> Totale periodo
          </div>
          <p className="text-lg md:text-xl font-bold">{euro(totalPeriod)}</p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Receipt className="w-3.5 h-3.5" /> Fatturato ({periodInvoices.length})
          </div>
          <p className="text-lg md:text-xl font-bold">{euro(invoiced)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Incassato {euro(invoicedPaid)}
            {invoicedPending > 0 && ` · Da saldare ${euro(invoicedPending)}`}
          </p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Wrench className="w-3.5 h-3.5" /> Assistenza ({periodMaintenance.length})
          </div>
          <p className="text-lg md:text-xl font-bold">{euro(maintenanceCost)}</p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> Totale da sempre
          </div>
          <p className="text-lg md:text-xl font-bold">{euro(totalEver)}</p>
        </div>
      </div>

      {/* Servizi nel periodo */}
      <div>
        <h4 className="font-medium text-sm md:text-base mb-2 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Servizi nel periodo selezionato ({servicesInPeriod.length})
        </h4>
        {servicesInPeriod.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun servizio attivo in questo periodo.</p>
        ) : (
          <div className="space-y-2">
            {servicesInPeriod.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-secondary/30 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.service_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Dal {format(new Date(s.created_at), "dd/MM/yyyy", { locale: it })}
                    {s.expiration_date &&
                      ` · Scadenza ${format(new Date(s.expiration_date), "dd/MM/yyyy", { locale: it })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{euro(Number(s.price || 0))}</span>
                  <Badge className={`text-[10px] ${statusColors[s.status] || ""}`}>
                    {statusLabels[s.status] || s.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stato servizi */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <p className="text-sm font-medium mb-2">
            Servizi attivi ({activeServices.length}) · {euro(recurringValue)} di valore ricorrente
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {activeServices.length === 0 && <li>Nessun servizio attivo</li>}
            {activeServices.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate">{s.service_name}</span>
                <span>{euro(Number(s.price || 0))}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
          <p className="text-sm font-medium mb-2">
            Servizi non attivi ({inactiveServices.length})
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {inactiveServices.length === 0 && <li>Nessun servizio disattivato</li>}
            {inactiveServices.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate">{s.service_name}</span>
                <span>{statusLabels[s.status] || s.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
