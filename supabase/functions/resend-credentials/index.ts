import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResendCredentialsRequest {
  clientId: string;
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("resend-credentials function called", { method: req.method });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("Email provider non configurato (RESEND_API_KEY mancante)");
    }
    const resend = new Resend(resendKey);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { clientId, email, name }: ResendCredentialsRequest = await req.json();
    console.log("Processing resend for", { clientId, email, name });

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("client_user_id")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("Client not found:", clientError);
      throw new Error("Cliente non trovato.");
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://kthxektvgaidqjetjsur.lovableproject.com";
    const redirectTo = `${siteUrl}/client-login`;
    const from = Deno.env.get("RESEND_FROM") || "Assistenza <onboarding@resend.dev>";

    // Decide which link to generate
    let linkType: "invite" | "recovery" = clientData?.client_user_id ? "recovery" : "invite";

    let linkRes =
      linkType === "invite"
        ? await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              redirectTo,
              data: {
                name,
                client_id: clientId,
                is_client: true,
              },
            },
          })
        : await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo },
          });

    // If invite fails because the user already exists, fall back to recovery.
    if (linkType === "invite" && (linkRes.error || !linkRes.data?.properties?.action_link)) {
      console.warn("Invite generation failed, fallback to recovery:", linkRes.error);
      linkType = "recovery";
      linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
    }

    if (linkRes.error || !linkRes.data?.properties?.action_link) {
      console.error("Error generating link:", linkRes.error);
      throw new Error(
        `Impossibile generare il link: ${linkRes.error?.message || "errore sconosciuto"}`
      );
    }

    const userId = linkRes.data.user.id;
    const actionLink = linkRes.data.properties.action_link;

    // Ensure client is linked to user id (safe even if already set)
    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ client_user_id: userId })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating client with user ID:", updateError);
      throw new Error(`Impossibile collegare l'utente al cliente: ${updateError.message}`);
    }

    const subject = linkType === "invite" ? "Imposta la tua password" : "Reimposta la tua password";
    const cta = linkType === "invite" ? "Imposta password" : "Reimposta password";

    const emailResponse = await resend.emails.send({
      from,
      to: [email],
      subject,
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">Ciao ${name},</h2>
          <p style="margin: 0 0 12px;">
            ${
              linkType === "invite"
                ? "Ecco il link per impostare la tua password e accedere al portale clienti."
                : "Ecco il link per reimpostare la tua password del portale clienti."
            }
          </p>
          <p style="margin: 0 0 16px;">
            <a href="${actionLink}" style="display: inline-block; padding: 10px 14px; border-radius: 10px; text-decoration: none; background: #111827; color: #ffffff;">
              ${cta}
            </a>
          </p>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
          <p style="margin: 0; font-size: 12px; word-break: break-all; color: #111827;">${actionLink}</p>
        </div>
      `,
    });

    console.log("Email sent via Resend:", { id: emailResponse?.data?.id, linkType, userId });

    return new Response(
      JSON.stringify({
        success: true,
        userExists: linkType === "recovery",
        message: linkType === "invite" ? "Invito inviato" : "Recupero password inviato",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-credentials:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
