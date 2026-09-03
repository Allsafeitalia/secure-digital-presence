import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building, Check, Copy, Euro, Loader2, Wallet } from "lucide-react";

export const PAYPAL_ME = "https://www.paypal.com/paypalme/allsafeitalia";

export const BANK_DETAILS = {
  recipient: "Giuseppe Mastronardi",
  iban: "IT26M0306234210000002242244",
  bic: "MEDBITMMXXX",
};

type PaymentMethod = "paypal" | "bank_transfer";

interface ServicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "service" | "maintenance";
  itemId: string | null;
  itemName: string;
  amount: number | null;
  orderNumber: string | null;
  onCompleted?: () => void;
}

export const ServicePaymentDialog = ({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  amount,
  orderNumber,
  onCompleted,
}: ServicePaymentDialogProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal");
  const [order, setOrder] = useState<string | null>(orderNumber);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !itemId) return;
    setPaymentMethod("paypal");
    setOrder(orderNumber);

    if (!orderNumber) {
      setIsLoadingOrder(true);
      supabase
        .rpc("client_ensure_order_number", { p_item_type: itemType, p_item_id: itemId })
        .then(({ data, error }) => {
          if (error) {
            console.error("Order number error:", error);
          } else if (data) {
            setOrder(data as string);
          }
          setIsLoadingOrder(false);
        });
    }
  }, [open, itemId, itemType, orderNumber]);

  const formatPrice = (price: number | null) =>
    price === null || price === undefined
      ? "N/D"
      : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(price);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copiato", description: `${field} copiato negli appunti` });
  };

  const causale = order ? `Ordine n. ${order}` : "Ordine n. (in generazione)";

  const handleConfirm = async () => {
    if (!itemId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("client_set_payment_method", {
        p_item_type: itemType,
        p_item_id: itemId,
        p_method: paymentMethod,
      });
      if (error) throw error;

      if (paymentMethod === "paypal") {
        window.open(`${PAYPAL_ME}/${(amount ?? 0).toFixed(2)}EUR`, "_blank");
        toast({
          title: "Pagamento PayPal avviato",
          description: `Inserisci nella nota: ${causale}`,
        });
      } else {
        toast({
          title: "Bonifico registrato",
          description: `Usa come causale: ${causale}. Confermeremo dopo la verifica.`,
        });
      }

      onOpenChange(false);
      onCompleted?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Paga il servizio
          </DialogTitle>
          <DialogDescription>
            {itemName}
            {order && <span className="text-muted-foreground"> - {order}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Importo da pagare</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoadingOrder ? "Generazione numero ordine..." : `Numero ordine: ${order ?? "N/D"}`}
            </p>
          </div>

          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <div className="space-y-3">
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === "paypal" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setPaymentMethod("paypal")}
              >
                <RadioGroupItem value="paypal" id="pay-paypal" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="pay-paypal" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Wallet className="w-5 h-5 text-sky-600" />
                    PayPal.me
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importo precompilato. Indica il numero ordine nella nota.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setPaymentMethod("bank_transfer")}
              >
                <RadioGroupItem value="bank_transfer" id="pay-bank" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="pay-bank" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Building className="w-5 h-5 text-emerald-600" />
                    Bonifico Bancario
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Il pagamento sarà confermato dopo la verifica.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          {paymentMethod === "paypal" && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-2">
              <p className="text-sm text-sky-900">
                Verrai reindirizzato a PayPal.me. Inserisci nella nota: <strong>{causale}</strong>
              </p>
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <p className="text-sky-900 font-mono text-xs sm:text-sm break-all">{PAYPAL_ME}</p>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(PAYPAL_ME, "Link PayPal")}>
                  {copiedField === "Link PayPal" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {paymentMethod === "bank_transfer" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
              <h4 className="font-medium text-emerald-900">Estremi per il bonifico</h4>
              {[
                { label: "Intestatario", value: BANK_DETAILS.recipient },
                { label: "IBAN", value: BANK_DETAILS.iban },
                { label: "BIC/SWIFT", value: BANK_DETAILS.bic },
                { label: "Causale", value: causale },
                { label: "Importo", value: formatPrice(amount) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 p-2 bg-white rounded border">
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-800">{row.label}</p>
                    <p className="font-mono text-xs sm:text-sm text-emerald-950 break-all">{row.value}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(row.value, row.label)}>
                    {copiedField === row.label ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || isLoadingOrder}>
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {paymentMethod === "paypal" ? "Paga con PayPal" : "Conferma bonifico"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
