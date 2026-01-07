import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SERVICE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { itemId, itemType, orderNumber } = await req.json();
    logStep("Request body", { itemId, itemType, orderNumber });

    if (!itemId || !itemType) {
      throw new Error("Missing required fields: itemId, itemType");
    }

    // Get item details
    let itemName: string;
    let amount: number;
    
    if (itemType === "service") {
      const { data: service, error: serviceError } = await supabaseClient
        .from("client_services")
        .select("service_name, price")
        .eq("id", itemId)
        .single();
      
      if (serviceError || !service) throw new Error("Service not found");
      itemName = service.service_name;
      amount = Math.round((service.price || 0) * 100); // Convert to cents
      logStep("Service found", { itemName, amount });
    } else {
      const { data: maintenance, error: maintenanceError } = await supabaseClient
        .from("maintenance_requests")
        .select("title, cost")
        .eq("id", itemId)
        .single();
      
      if (maintenanceError || !maintenance) throw new Error("Maintenance request not found");
      itemName = maintenance.title;
      amount = Math.round((maintenance.cost || 0) * 100); // Convert to cents
      logStep("Maintenance found", { itemName, amount });
    }

    if (amount <= 0) {
      throw new Error("Invalid payment amount");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: itemName,
              description: orderNumber ? `Ordine: ${orderNumber}` : undefined,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/client-portal?payment=success&order=${orderNumber}`,
      cancel_url: `${origin}/client-portal?payment=cancelled`,
      metadata: {
        itemId,
        itemType,
        orderNumber: orderNumber || "",
      },
      payment_intent_data: {
        metadata: {
          itemId,
          itemType,
          orderNumber: orderNumber || "",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update payment method to card
    const table = itemType === "service" ? "client_services" : "maintenance_requests";
    await supabaseClient
      .from(table)
      .update({ payment_method: "card" })
      .eq("id", itemId);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
