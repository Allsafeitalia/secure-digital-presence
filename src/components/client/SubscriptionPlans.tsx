import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Check,
  Crown,
  Zap,
  Star,
  Calendar,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";

// Stripe product and price IDs
const PLANS = {
  base: {
    name: "Piano Base Mensile",
    description: "Assistenza base mensile - supporto email, interventi standard",
    price: 29,
    priceId: "price_1SmF2FB5jgND9DxncI49bRTK",
    productId: "prod_TjiTg1rYyfr2AC",
    interval: "mese",
    features: [
      "Supporto via email",
      "Interventi standard entro 48h",
      "Report mensili",
      "Backup settimanali",
    ],
    icon: Zap,
    color: "bg-blue-500",
    popular: false,
  },
  premium: {
    name: "Piano Premium Mensile",
    description: "Assistenza premium mensile - supporto prioritario, interventi illimitati",
    price: 79,
    priceId: "price_1SmF5dB5jgND9Dxnnn4nYB2S",
    productId: "prod_TjiWTZZULHAyw0",
    interval: "mese",
    features: [
      "Supporto prioritario 24/7",
      "Interventi illimitati",
      "Risposta entro 4h",
      "Report settimanali",
      "Backup giornalieri",
      "Monitoraggio avanzato",
    ],
    icon: Crown,
    color: "bg-purple-500",
    popular: true,
  },
  annual: {
    name: "Piano Annuale",
    description: "Assistenza annuale - risparmio 10%, tutte le funzionalità premium",
    price: 290,
    priceId: "price_1SmF5sB5jgND9DxnLaWUzyNC",
    productId: "prod_TjiWgeiUZmbhVw",
    interval: "anno",
    features: [
      "Tutte le funzionalità Premium",
      "Risparmio del 10%",
      "Priorità massima",
      "Account manager dedicato",
      "Review trimestrale gratuita",
    ],
    icon: Star,
    color: "bg-amber-500",
    popular: false,
  },
};

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
  plan_name: string | null;
}

export function SubscriptionPlans() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error("Error checking subscription:", error);
        throw error;
      }

      setSubscriptionStatus(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
      // Don't show error toast, just set as not subscribed
      setSubscriptionStatus({
        subscribed: false,
        product_id: null,
        price_id: null,
        subscription_end: null,
        plan_name: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    const plan = PLANS[planKey as keyof typeof PLANS];
    if (!plan) return;

    setIsCheckingOut(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: plan.priceId,
          mode: 'subscription'
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      // Open in new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Checkout aperto",
        description: "Completa il pagamento nella nuova finestra",
      });
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la sessione di pagamento",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");

      // Open in new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Portale aperto",
        description: "Gestisci il tuo abbonamento nella nuova finestra",
      });
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aprire il portale di gestione",
        variant: "destructive",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/D";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getCurrentPlanKey = () => {
    if (!subscriptionStatus?.product_id) return null;
    return Object.keys(PLANS).find(
      key => PLANS[key as keyof typeof PLANS].productId === subscriptionStatus.product_id
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const currentPlanKey = getCurrentPlanKey();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Piani di Assistenza
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Scegli il piano più adatto alle tue esigenze
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkSubscription} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Current Subscription */}
      {subscriptionStatus?.subscribed && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">
                    Abbonamento Attivo: {subscriptionStatus.plan_name}
                  </p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Rinnovo: {formatDate(subscriptionStatus.subscription_end)}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={isOpeningPortal}
                className="border-green-300 hover:bg-green-100"
              >
                {isOpeningPortal ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Gestisci Abbonamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([key, plan]) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlanKey === key;
          
          return (
            <Card 
              key={key} 
              className={`relative overflow-hidden transition-all ${
                plan.popular ? "border-purple-300 shadow-lg shadow-purple-100" : ""
              } ${isCurrentPlan ? "border-green-400 bg-green-50/30" : ""}`}
            >
              {plan.popular && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Popolare
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Il tuo piano
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-xl ${plan.color}/10 flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6`} style={{ color: plan.color.replace("bg-", "").replace("-500", "") === "blue" ? "#3b82f6" : plan.color.replace("bg-", "").replace("-500", "") === "purple" ? "#a855f7" : "#f59e0b" }} />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-4">
                <div className="mb-6">
                  <span className="text-4xl font-bold">€{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </div>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                {isCurrentPlan ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal}
                  >
                    {isOpeningPortal ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Gestisci
                  </Button>
                ) : subscriptionStatus?.subscribed ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal}
                  >
                    Cambia Piano
                  </Button>
                ) : (
                  <Button 
                    className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                    onClick={() => handleSubscribe(key)}
                    disabled={isCheckingOut !== null}
                  >
                    {isCheckingOut === key ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Abbonati
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Pagamenti sicuri con Stripe</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tutti i pagamenti sono processati in modo sicuro tramite Stripe. 
                Puoi modificare o cancellare il tuo abbonamento in qualsiasi momento dal portale di gestione.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
