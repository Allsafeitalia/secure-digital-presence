import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Euro,
  Clock,
  CheckCircle2,
  RefreshCw,
  Building,
  CreditCard,
  Globe,
  Server,
  Wrench,
  User,
} from "lucide-react";

interface PaymentItem {
  id: string;
  name: string;
  price: number | null;
  payment_status: string;
  payment_method: string | null;
  payment_date: string | null;
  payment_notes: string | null;
  client_name: string;
  client_email: string;
  type: "service" | "maintenance";
  service_type?: string;
  request_type?: string;
}

export function PaymentManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"awaiting" | "pending" | "paid">("awaiting");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      // Fetch services with payment info
      const { data: services, error: servicesError } = await supabase
        .from("client_services")
        .select(`
          id, 
          service_name, 
          service_type,
          price, 
          payment_status, 
          payment_method,
          payment_date,
          payment_notes,
          clients!inner(name, email)
        `)
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Fetch maintenance with payment info
      const { data: maintenance, error: maintenanceError } = await supabase
        .from("maintenance_requests")
        .select(`
          id, 
          title, 
          cost, 
          payment_status, 
          payment_method,
          payment_date,
          payment_notes,
          request_type,
          clients!inner(name, email)
        `)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (maintenanceError) throw maintenanceError;

      const items: PaymentItem[] = [
        ...(services || []).map((s: any) => ({
          id: s.id,
          name: s.service_name,
          price: s.price,
          payment_status: s.payment_status,
          payment_method: s.payment_method,
          payment_date: s.payment_date,
          payment_notes: s.payment_notes,
          client_name: s.clients.name,
          client_email: s.clients.email,
          type: "service" as const,
          service_type: s.service_type,
        })),
        ...(maintenance || []).map((m: any) => ({
          id: m.id,
          name: m.title,
          price: m.cost,
          payment_status: m.payment_status,
          payment_method: m.payment_method,
          payment_date: m.payment_date,
          payment_notes: m.payment_notes,
          client_name: m.clients.name,
          client_email: m.clients.email,
          type: "maintenance" as const,
          request_type: m.request_type,
        })),
      ];

      setPayments(items);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i pagamenti",
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/D";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openConfirmModal = (payment: PaymentItem) => {
    setSelectedPayment(payment);
    setPaymentNotes("");
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;

    setIsProcessing(true);
    try {
      const table = selectedPayment.type === "service" ? "client_services" : "maintenance_requests";
      
      const { error } = await supabase
        .from(table)
        .update({
          payment_status: "paid",
          payment_date: new Date().toISOString(),
          payment_notes: paymentNotes || null,
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Pagamento confermato",
        description: `Il pagamento per "${selectedPayment.name}" è stato confermato`,
      });

      setShowConfirmModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile confermare il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getItemIcon = (item: PaymentItem) => {
    if (item.type === "maintenance") {
      return <Wrench className="w-4 h-4" />;
    }
    if (item.service_type === "hosting") return <Server className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  const filteredPayments = payments.filter((p) => {
    if (activeTab === "awaiting") return p.payment_status === "awaiting_transfer";
    if (activeTab === "pending") return p.payment_status === "pending";
    if (activeTab === "paid") return p.payment_status === "paid";
    return true;
  });

  const awaitingCount = payments.filter(p => p.payment_status === "awaiting_transfer").length;
  const pendingCount = payments.filter(p => p.payment_status === "pending").length;
  const paidCount = payments.filter(p => p.payment_status === "paid").length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Euro className="w-6 h-6" />
            Gestione Pagamenti
          </h2>
          <p className="text-muted-foreground">Conferma i bonifici e gestisci i pagamenti</p>
        </div>
        <Button variant="outline" onClick={fetchPayments} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="awaiting" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            In attesa bonifico
            {awaitingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{awaitingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Da pagare
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Pagati
            <Badge variant="outline" className="ml-1">{paidCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Euro className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun pagamento in questa categoria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPayments.map((payment) => (
                <Card key={`${payment.type}-${payment.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          payment.payment_status === "paid" 
                            ? "bg-green-500/10" 
                            : payment.payment_status === "awaiting_transfer"
                            ? "bg-blue-500/10"
                            : "bg-orange-500/10"
                        }`}>
                          {getItemIcon(payment)}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {payment.name}
                            <Badge variant="outline" className="text-xs">
                              {payment.type === "maintenance" ? "Intervento" : "Servizio"}
                            </Badge>
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="w-3 h-3" />
                            {payment.client_name} ({payment.client_email})
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="font-semibold text-lg">
                              {formatPrice(payment.price)}
                            </span>
                            <Badge 
                              variant={
                                payment.payment_status === "paid" 
                                  ? "default" 
                                  : payment.payment_status === "awaiting_transfer"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                payment.payment_status === "paid"
                                  ? "bg-green-500"
                                  : payment.payment_status === "awaiting_transfer"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-orange-700"
                              }
                            >
                              {payment.payment_status === "paid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {payment.payment_status === "awaiting_transfer" && <Building className="w-3 h-3 mr-1" />}
                              {payment.payment_status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                              {payment.payment_status === "paid" 
                                ? "Pagato" 
                                : payment.payment_status === "awaiting_transfer"
                                ? "In attesa bonifico"
                                : "Da pagare"}
                            </Badge>
                            {payment.payment_method && (
                              <Badge variant="outline">
                                {payment.payment_method === "card" ? (
                                  <><CreditCard className="w-3 h-3 mr-1" /> Carta</>
                                ) : (
                                  <><Building className="w-3 h-3 mr-1" /> Bonifico</>
                                )}
                              </Badge>
                            )}
                          </div>
                          {payment.payment_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Pagato il: {formatDate(payment.payment_date)}
                            </p>
                          )}
                          {payment.payment_notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {payment.payment_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {payment.payment_status === "awaiting_transfer" && (
                        <Button onClick={() => openConfirmModal(payment)} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Conferma bonifico
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Payment Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma pagamento bonifico</DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>
                  Stai confermando il pagamento di <strong>{formatPrice(selectedPayment.price)}</strong> per "{selectedPayment.name}" 
                  da parte di <strong>{selectedPayment.client_name}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (opzionale)</label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Es: Bonifico ricevuto il 15/01, riferimento XYZ123"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Conferma pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
