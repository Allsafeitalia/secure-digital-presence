import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Globe,
  Server,
  HardDrive,
  Cloud,
  AlertTriangle,
  CalendarClock,
  Euro,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface OvhService {
  category: string;
  name: string;
  expiration: string | null;
  status: string | null;
  renew_mode: string | null;
  renew_period: string | null;
  price: number | null;
  currency: string | null;
}

const categoryIcon = (category: string) => {
  switch (category) {
    case "Dominio": return <Globe className="w-4 h-4" />;
    case "Hosting": return <Cloud className="w-4 h-4" />;
    case "VPS": return <Server className="w-4 h-4" />;
    default: return <HardDrive className="w-4 h-4" />;
  }
};

const urgency = (expiration: string | null) => {
  if (!expiration) return { label: "N/D", className: "bg-muted text-muted-foreground", days: null as number | null };
  const days = differenceInDays(parseISO(expiration), new Date());
  if (days < 0) return { label: "Scaduto", className: "bg-destructive/10 text-destructive", days };
  if (days <= 30) return { label: `${days} gg`, className: "bg-destructive/10 text-destructive", days };
  if (days <= 60) return { label: `${days} gg`, className: "bg-orange-100 text-orange-700", days };
  return { label: `${days} gg`, className: "bg-green-100 text-green-700", days };
};

export const OvhExpirations = () => {
  const [services, setServices] = useState<OvhService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("ovh-expirations");
    if (error || data?.error) {
      toast({
        title: "Errore OVH",
        description: data?.error ?? error?.message ?? "Impossibile caricare i dati",
        variant: "destructive",
      });
    } else {
      setServices(data.services || []);
      setErrors(data.errors || []);
      setLastSync(new Date());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const expiring30 = services.filter((s) => {
    if (!s.expiration) return false;
    const d = differenceInDays(parseISO(s.expiration), new Date());
    return d >= 0 && d <= 30;
  });
  const expired = services.filter((s) => {
    if (!s.expiration) return false;
    return differenceInDays(parseISO(s.expiration), new Date()) < 0;
  });
  const totalCost = services.reduce((sum, s) => sum + (s.price ?? 0), 0);
  const hasPrices = services.some((s) => s.price !== null);

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg md:text-2xl">Scadenze OVH</h2>
          <p className="text-muted-foreground text-sm">
            Domini, hosting, VPS e server dal tuo account OVH
            {lastSync && ` · aggiornato alle ${format(lastSync, "HH:mm")}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Aggiorna
        </Button>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CalendarClock size={14} /> Servizi totali
          </div>
          <div className="text-2xl font-bold">{services.length}</div>
        </div>
        <div className="bg-card border border-destructive/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-destructive text-xs mb-1">
            <AlertTriangle size={14} /> In scadenza (30 gg)
          </div>
          <div className="text-2xl font-bold text-destructive">{expiring30.length}</div>
        </div>
        <div className="bg-card border border-destructive/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-destructive text-xs mb-1">
            <AlertTriangle size={14} /> Scaduti
          </div>
          <div className="text-2xl font-bold text-destructive">{expired.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Euro size={14} /> Costo rinnovi stimato
          </div>
          <div className="text-2xl font-bold">
            {hasPrices ? `€ ${totalCost.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      {/* Avvisi */}
      {expiring30.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <h3 className="font-medium text-destructive text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Attenzione: servizi in scadenza entro 30 giorni
          </h3>
          <ul className="text-sm space-y-1">
            {expiring30.map((s) => (
              <li key={`${s.category}-${s.name}`} className="text-foreground">
                <strong>{s.name}</strong> ({s.category}) — scade il{" "}
                {format(parseISO(s.expiration!), "dd MMMM yyyy", { locale: it })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabella */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left p-3 font-medium">Servizio</th>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Scadenza</th>
                <th className="text-left p-3 font-medium">Urgenza</th>
                <th className="text-left p-3 font-medium">Rinnovo</th>
                <th className="text-right p-3 font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Caricamento dati da OVH...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nessun servizio trovato sull'account OVH
                  </td>
                </tr>
              ) : (
                services.map((s) => {
                  const u = urgency(s.expiration);
                  return (
                    <tr key={`${s.category}-${s.name}`} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2 font-medium">
                          {categoryIcon(s.category)}
                          {s.name}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{s.category}</td>
                      <td className="p-3">
                        {s.expiration
                          ? format(parseISO(s.expiration), "dd/MM/yyyy", { locale: it })
                          : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.className}`}>
                          {u.label}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {s.renew_mode ?? "—"}
                        {s.renew_period ? ` · ${s.renew_period}` : ""}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {s.price !== null ? `€ ${s.price.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {errors.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Alcune categorie potrebbero non essere accessibili con i permessi attuali del token.
        </p>
      )}
    </div>
  );
};
