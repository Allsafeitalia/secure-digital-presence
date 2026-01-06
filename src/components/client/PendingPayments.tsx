import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Building,
  Euro,
  Clock,
  CheckCircle2,
  RefreshCw,
  Globe,
  Server,
  Wrench,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface PendingService {
  id: string;
  service_name: string;
  service_type: string;
  price: number | null;
  payment_status: string;
  domain_name: string | null;
  billing_cycle: string;
  type: "service";
}

interface PendingMaintenance {
  id: string;
  title: string;
  cost: number | null;
  payment_status: string;
  request_type: string;
  completed_at: string | null;
  type: "maintenance";
}

type PendingItem = PendingService | PendingMaintenance;

interface PendingPaymentsProps {
  clientId: string;
  onRefresh?: () => void;
}

const billingCycleLabels: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  biannual: "Semestrale",
  yearly: "Annuale",
  one_time: "Una tantum",
};

export function PendingPayments({ clientId, onRefresh }: PendingPaymentsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchPendingItems();
    }
  }, [clientId]);

  const fetchPendingItems = async () => {
    setIsLoading(true);
    try {
      // Fetch pending services
      const { data: services, error: servicesError } = await supabase
        .from("client_services")
        .select("id, service_name, service_type, price, payment_status, domain_name, billing_cycle")
        .eq("client_id", clientId)
        .in("payment_status", ["pending", "awaiting_transfer"]);

      if (servicesError) throw servicesError;

      // Fetch pending maintenance requests (completed but unpaid)
      const { data: maintenance, error: maintenanceError } = await supabase
        .from("maintenance_requests")
        .select("id, title, cost, payment_status, request_type, completed_at")
        .eq("client_id", clientId)
        .eq("status", "completed")
        .in("payment_status", ["pending", "awaiting_transfer"]);

      if (maintenanceError) throw maintenanceError;

      const items: PendingItem[] = [
        ...(services || []).map(s => ({ ...s, type: "service" as const })),
        ...(maintenance || []).map(m => ({ ...m, type: "maintenance" as const })),
      ];

      setPendingItems(items);
    } catch (error) {
      console.error("Error fetching pending items:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i pagamenti in sospeso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/D";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const getItemIcon = (item: PendingItem) => {
    if (item.type === "maintenance") {
      return <Wrench className="w-5 h-5" />;
    }
    const serviceItem = item as PendingService;
    if (serviceItem.service_type === "hosting") return <Server className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
  };

  const getItemName = (item: PendingItem) => {
    if (item.type === "maintenance") {
      return (item as PendingMaintenance).title;
    }
    return (item as PendingService).service_name;
  };

  const getItemPrice = (item: PendingItem) => {
    if (item.type === "maintenance") {
      return (item as PendingMaintenance).cost;
    }
    return (item as PendingService).price;
  };

  const openPaymentModal = (item: PendingItem) => {
    setSelectedItem(item);
    setPaymentMethod("card");
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      if (paymentMethod === "card") {
        // Create Stripe checkout session
        const { data, error } = await supabase.functions.invoke("create-service-payment", {
          body: {
            itemId: selectedItem.id,
            itemType: selectedItem.type,
            amount: getItemPrice(selectedItem),
            description: getItemName(selectedItem),
          },
        });

        if (error) throw error;
        if (!data?.url) throw new Error("No checkout URL returned");

        // Open Stripe checkout
        window.open(data.url, "_blank");

        toast({
          title: "Checkout aperto",
          description: "Completa il pagamento nella nuova finestra. Una volta completato, il pagamento verrà confermato automaticamente.",
        });
      } else {
        // Mark as awaiting bank transfer
        const table = selectedItem.type === "service" ? "client_services" : "maintenance_requests";
        
        const { error } = await supabase
          .from(table)
          .update({ 
            payment_status: "awaiting_transfer",
            payment_method: "bank_transfer",
          })
          .eq("id", selectedItem.id);

        if (error) throw error;

        toast({
          title: "Richiesta registrata",
          description: "Il pagamento con bonifico è stato registrato. Una volta ricevuto il bonifico, l'amministratore confermerà il pagamento.",
        });

        fetchPendingItems();
        onRefresh?.();
      }

      setShowPaymentModal(false);
      setSelectedItem(null);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile processare il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return null; // Hide section if no pending payments
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Euro className="w-5 h-5 text-orange-500" />
          Pagamenti in Sospeso
        </h2>
        <Button variant="outline" size="sm" onClick={fetchPendingItems} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      <div className="grid gap-4">
        {pendingItems.map((item) => (
          <Card key={`${item.type}-${item.id}`} className="border-orange-200 bg-orange-50/30">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    {getItemIcon(item)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{getItemName(item)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.type === "maintenance" ? (
                        <>Intervento - {(item as PendingMaintenance).request_type === "maintenance" ? "Manutenzione" : "Assistenza"}</>
                      ) : (
                        <>
                          {(item as PendingService).domain_name && `${(item as PendingService).domain_name} • `}
                          {billingCycleLabels[(item as PendingService).billing_cycle] || (item as PendingService).billing_cycle}
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={item.payment_status === "awaiting_transfer" ? "secondary" : "outline"}
                        className={item.payment_status === "awaiting_transfer" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}
                      >
                        {item.payment_status === "awaiting_transfer" ? (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            In attesa bonifico
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Da pagare
                          </>
                        )}
                      </Badge>
                      <span className="font-semibold text-lg text-orange-600">
                        {formatPrice(getItemPrice(item))}
                      </span>
                    </div>
                  </div>
                </div>
                
                {item.payment_status === "pending" && (
                  <Button onClick={() => openPaymentModal(item)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Paga ora
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scegli il metodo di pagamento</DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>Stai pagando: <strong>{getItemName(selectedItem)}</strong> - {formatPrice(getItemPrice(selectedItem))}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as "card" | "bank_transfer")}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Carta di credito/debito</p>
                    <p className="text-sm text-muted-foreground">Pagamento immediato e sicuro con Stripe</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Building className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Bonifico bancario</p>
                    <p className="text-sm text-muted-foreground">Il pagamento verrà confermato dopo verifica del bonifico</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === "bank_transfer" && (
              <Card className="mt-4 bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Dati per il bonifico:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>IBAN:</strong> IT00X0000000000000000000000</p>
                    <p><strong>Intestatario:</strong> Nome Azienda</p>
                    <p><strong>Causale:</strong> Pagamento {selectedItem && getItemName(selectedItem)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Una volta effettuato il bonifico, l'amministratore confermerà il pagamento entro 1-2 giorni lavorativi.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Annulla
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing}>
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : paymentMethod === "card" ? (
                <ExternalLink className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {paymentMethod === "card" ? "Procedi al pagamento" : "Conferma bonifico"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
