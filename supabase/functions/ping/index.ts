import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const now = new Date().toISOString();
  const auth = req.headers.get("authorization");
  const apikey = req.headers.get("apikey");

  console.log("ping called", {
    method: req.method,
    time: now,
    hasAuthHeader: Boolean(auth),
    authPrefix: auth ? auth.slice(0, 18) : null,
    hasApiKey: Boolean(apikey),
    apiKeyPrefix: apikey ? apikey.slice(0, 10) : null,
  });

  let body: any = null;
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    // ignore
  }

  return new Response(
    JSON.stringify({
      ok: true,
      time: now,
      echo: body,
      received: {
        hasAuthHeader: Boolean(auth),
        hasApiKey: Boolean(apikey),
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

serve(handler);
