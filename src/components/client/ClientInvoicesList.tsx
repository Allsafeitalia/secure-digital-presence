import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CheckCircle2, Clock } from "lucide-react";
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
}

export const ClientInvoicesList = ({ clientId }: { clientId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (error) console.error("Error fetching invoices:", error);
      setInvoices((data as Invoice[]) || []);
      setIsLoading(false);
    };
    load();
  }, [clientId]);

  const total = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const unpaid = invoices.filter((i) => i.payment_status !== "paid");
  const unpaidTotal = unpaid.reduce((s, i) => s + Number(i.total_amount || 0), 0);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{invoices.length}</p>
            <p className="text-sm text-muted-foreground">Fatture emesse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">€ {total.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Totale fatturato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">€ {unpaidTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Da saldare ({unpaid.length})</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Le tue fatture
          </CardTitle>
          <CardDescription>Elenco delle fatture emesse e relativo stato di pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna fattura disponibile</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-start justify-between gap-4 rounded-xl border p-4"
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
                      {format(new Date(inv.invoice_date), "dd MMMM yyyy", { locale: it })}
                      {inv.description ? ` · ${inv.description}` : ""}
                    </p>
                    {inv.payment_date && (
                      <p className="text-xs text-muted-foreground">
                        Saldata il {format(new Date(inv.payment_date), "dd/MM/yyyy")}
                        {inv.payment_method ? ` · ${inv.payment_method}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    € {Number(inv.total_amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
