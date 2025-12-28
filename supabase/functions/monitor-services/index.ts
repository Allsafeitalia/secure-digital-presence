import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceToMonitor {
  id: string;
  url_to_monitor: string;
  service_name: string;
  client_id: string;
}

const checkUrl = async (url: string): Promise<{ isOnline: boolean; responseTimeMs: number; statusCode: number | null; error: string | null }> => {
  const startTime = Date.now();
  
  try {
    // Add protocol if missing
    let urlToCheck = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      urlToCheck = "https://" + url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(urlToCheck, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "ServiceMonitor/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    return {
      isOnline: response.ok || response.status < 500,
      responseTimeMs,
      statusCode: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    
    let errorMessage = "Unknown error";
    if (error.name === "AbortError") {
      errorMessage = "Timeout (>10s)";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      isOnline: false,
      responseTimeMs,
      statusCode: null,
      error: errorMessage,
    };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("monitor-services function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all services with URLs to monitor
    const { data: services, error: fetchError } = await supabaseAdmin
      .from("client_services")
      .select("id, url_to_monitor, service_name, client_id")
      .not("url_to_monitor", "is", null)
      .eq("status", "active");

    if (fetchError) {
      console.error("Error fetching services:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${services?.length || 0} services to monitor`);

    const results: { serviceId: string; isOnline: boolean; responseTimeMs: number }[] = [];

    // Check each service
    for (const service of (services as ServiceToMonitor[]) || []) {
      console.log(`Checking service: ${service.service_name} - ${service.url_to_monitor}`);
      
      const checkResult = await checkUrl(service.url_to_monitor);
      
      console.log(`Result for ${service.service_name}: online=${checkResult.isOnline}, time=${checkResult.responseTimeMs}ms`);

      // Update service status
      const { error: updateError } = await supabaseAdmin
        .from("client_services")
        .update({
          is_online: checkResult.isOnline,
          last_check_at: new Date().toISOString(),
          last_response_time_ms: checkResult.responseTimeMs,
          last_error: checkResult.error,
        })
        .eq("id", service.id);

      if (updateError) {
        console.error(`Error updating service ${service.id}:`, updateError);
      }

      // Log the check result
      const { error: logError } = await supabaseAdmin
        .from("service_monitoring_logs")
        .insert({
          service_id: service.id,
          is_online: checkResult.isOnline,
          response_time_ms: checkResult.responseTimeMs,
          status_code: checkResult.statusCode,
          error_message: checkResult.error,
        });

      if (logError) {
        console.error(`Error logging check for service ${service.id}:`, logError);
      }

      results.push({
        serviceId: service.id,
        isOnline: checkResult.isOnline,
        responseTimeMs: checkResult.responseTimeMs,
      });
    }

    console.log(`Monitoring complete. Checked ${results.length} services.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: results.length,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in monitor-services:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
