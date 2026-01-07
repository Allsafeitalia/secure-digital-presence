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
  Euro,
  CreditCard,
  Building,
  Clock,
  Copy,
  Check,
  Globe,
  Server,
  Shield,
  Mail,
  Database,
  Wrench,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";

type ServiceType = "website" | "domain" | "hosting" | "backup" | "email" | "ssl" | "maintenance" | "other";

interface PendingService {
  id: string;
  order_number: string | null;
  service_name: string;
  service_type: ServiceType;
  price: number | null;
  payment_status: string;
  payment_method: string | null;
  expiration_date: string | null;
  billing_cycle: string;
  type: "service";
}

interface PendingMaintenance {
  id: string;
  order_number: string | null;
  title: string;
  cost: number | null;
  payment_status: string;
  payment_method: string | null;
  request_type: string;
  status: string;
  type: "maintenance";
  service_name?: string;
}

type PendingItem = PendingService | PendingMaintenance;

interface PendingPaymentsProps {
  clientId: string;
  onPaymentComplete?: () => void;
}

const serviceTypeConfig: Record<ServiceType, { icon: React.ElementType; label: string; color: string }> = {
  website: { icon: Globe, label: "Sito Web", color: "text-blue-500" },
  domain: { icon: Globe, label: "Dominio", color: "text-purple-500" },
  hosting: { icon: Server, label: "Hosting", color: "text-green-500" },
  backup: { icon: Database, label: "Backup", color: "text-orange-500" },
  email: { icon: Mail, label: "Email", color: "text-pink-500" },
  ssl: { icon: Shield, label: "SSL", color: "text-yellow-500" },
  maintenance: { icon: Wrench, label: "Manutenzione", color: "text-indigo-500" },
  other: { icon: Package, label: "Altro", color: "text-gray-500" },
};

const requestTypeLabels: Record<string, string> = {
  maintenance: "Manutenzione",
  support: "Assistenza Tecnica",
  update: "Aggiornamento",
  bug_fix: "Bug Fix",
};

const BANK_DETAILS = {
  recipient: "Dotcom di Giuseppe Mastronardi",
  iban: "IT26M0306234210000002242244",
  bic: "MEDBITMMXXX",
};

export const PendingPayments = ({ clientId, onPaymentComplete }: PendingPaymentsProps) => {
  const { toast } = useToast();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPayments();
  }, [clientId]);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      // Fetch pending services
      const { data: servicesData, error: servicesError } = await supabase
        .from("client_services")
        .select("id, order_number, service_name, service_type, price, payment_status, payment_method, expiration_date, billing_cycle")
        .eq("client_id", clientId)
        .eq("payment_status", "pending")
        .not("price", "is", null);

      if (servicesError) throw servicesError;

      // Fetch pending maintenance/support requests
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("maintenance_requests")
        .select(`
          id, order_number, title, cost, payment_status, payment_method, request_type, status,
          service:client_services(service_name)
        `)
        .eq("client_id", clientId)
        .eq("payment_status", "pending")
        .not("cost", "is", null)
        .in("status", ["resolved", "closed"]);

      if (maintenanceError) throw maintenanceError;

      const services: PendingItem[] = (servicesData || []).map((s) => ({
        ...s,
        service_type: s.service_type as ServiceType,
        type: "service" as const,
      }));

      const maintenance: PendingItem[] = (maintenanceData || []).map((m: any) => ({
        ...m,
        service_name: m.service?.service_name,
        type: "maintenance" as const,
      }));

      setPendingItems([...services, ...maintenance]);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i pagamenti in sospeso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayClick = (item: PendingItem) => {
    setSelectedItem(item);
    setPaymentMethod("card");
    setShowPaymentModal(true);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copiato",
      description: `${field} copiato negli appunti`,
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);

    try {
      if (paymentMethod === "card") {
        // Create Stripe payment session
        const { data, error } = await supabase.functions.invoke("create-service-payment", {
          body: {
            itemId: selectedItem.id,
            itemType: selectedItem.type,
            orderNumber: selectedItem.order_number,
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } else {
        // Bank transfer - update payment method
        const table = selectedItem.type === "service" ? "client_services" : "maintenance_requests";
        
        const { error } = await supabase
          .from(table)
          .update({
            payment_method: "bank_transfer",
            payment_notes: `Bonifico in attesa di verifica - Ordine: ${selectedItem.order_number}`,
          })
          .eq("id", selectedItem.id);

        if (error) throw error;

        toast({
          title: "Bonifico registrato",
          description: "Una volta verificato il pagamento, lo stato verrà aggiornato",
        });
      }

      setShowPaymentModal(false);
      setSelectedItem(null);
      fetchPendingPayments();
      onPaymentComplete?.();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/D";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const getItemPrice = (item: PendingItem) => {
    return item.type === "service" ? (item as PendingService).price : (item as PendingMaintenance).cost;
  };

  const getItemName = (item: PendingItem) => {
    if (item.type === "service") {
      return (item as PendingService).service_name;
    }
    return (item as PendingMaintenance).title;
  };

  const getItemDescription = (item: PendingItem) => {
    if (item.type === "service") {
      const service = item as PendingService;
      const config = serviceTypeConfig[service.service_type];
      return config.label;
    }
    const maint = item as PendingMaintenance;
    return requestTypeLabels[maint.request_type] || maint.request_type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Pagamenti in Sospeso</CardTitle>
              <CardDescription>
                Hai {pendingItems.length} pagament{pendingItems.length === 1 ? "o" : "i"} da effettuare
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const Icon = item.type === "service" 
                ? serviceTypeConfig[(item as PendingService).service_type].icon 
                : Wrench;
              const iconColor = item.type === "service"
                ? serviceTypeConfig[(item as PendingService).service_type].color
                : "text-indigo-500";

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-background rounded-lg border"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getItemName(item)}</span>
                        {item.order_number && (
                          <Badge variant="outline" className="text-xs">
                            {item.order_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{getItemDescription(item)}</p>
                      {item.type === "maintenance" && (item as PendingMaintenance).service_name && (
                        <p className="text-xs text-muted-foreground">
                          Servizio: {(item as PendingMaintenance).service_name}
                        </p>
                      )}
                      {item.payment_method === "bank_transfer" && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Bonifico in verifica
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(getItemPrice(item))}
                    </span>
                    {item.payment_method !== "bank_transfer" && (
                      <Button size="sm" onClick={() => handlePayClick(item)}>
                        <Euro className="w-4 h-4 mr-1" />
                        Paga
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Effettua Pagamento
            </DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>
                  <span className="font-medium">{getItemName(selectedItem)}</span>
                  {selectedItem.order_number && (
                    <span className="text-muted-foreground"> - {selectedItem.order_number}</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Importo da pagare</p>
              <p className="text-3xl font-bold text-primary">
                {selectedItem && formatPrice(getItemPrice(selectedItem))}
              </p>
            </div>

            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "bank_transfer")}>
              <div className="space-y-3">
                <div 
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setPaymentMethod("card")}
                >
                  <RadioGroupItem value="card" id="card" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer font-medium">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      Carta di Credito/Debito
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pagamento sicuro tramite Stripe. Accettiamo Visa, Mastercard, American Express.
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setPaymentMethod("bank_transfer")}
                >
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Building className="w-5 h-5 text-emerald-600" />
                      Bonifico Bancario
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Effettua un bonifico. Il pagamento sarà confermato dopo verifica.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>

            {paymentMethod === "bank_transfer" && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <h4 className="font-medium text-emerald-800 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Dati per il Bonifico
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">Intestatario</p>
                      <p className="text-emerald-900">{BANK_DETAILS.recipient}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(BANK_DETAILS.recipient, "Intestatario")}
                    >
                      {copiedField === "Intestatario" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">IBAN</p>
                      <p className="text-emerald-900 font-mono text-xs sm:text-sm">{BANK_DETAILS.iban}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(BANK_DETAILS.iban, "IBAN")}
                    >
                      {copiedField === "IBAN" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">BIC/SWIFT</p>
                      <p className="text-emerald-900 font-mono">{BANK_DETAILS.bic}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(BANK_DETAILS.bic, "BIC")}
                    >
                      {copiedField === "BIC" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  {selectedItem?.order_number && (
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <p className="text-xs text-emerald-600 font-medium">Causale</p>
                        <p className="text-emerald-900 font-mono">{selectedItem.order_number}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(selectedItem.order_number!, "Causale")}
                      >
                        {copiedField === "Causale" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {paymentMethod === "card" ? "Procedi al Pagamento" : "Conferma Bonifico"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
