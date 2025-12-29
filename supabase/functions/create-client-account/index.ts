import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientAccountRequest {
  clientId: string;
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("create-client-account function called");

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

    const { clientId, email, name }: CreateClientAccountRequest = await req.json();
    console.log(`Creating account for client: ${name} (${email})`);

    // Email provider (Resend)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("Email provider non configurato (RESEND_API_KEY mancante)");
    }
    const resend = new Resend(resendKey);

    // Get the site URL for the redirect
    const siteUrl = Deno.env.get("SITE_URL") || "https://kthxektvgaidqjetjsur.lovableproject.com";
    const redirectTo = `${siteUrl}/client-login`;

    const from = Deno.env.get("RESEND_FROM") || "Assistenza <onboarding@resend.dev>";

    // Generate an invite (or recovery) link and send it via Resend
    let linkType: "invite" | "recovery" = "invite";

    const inviteRes = await supabaseAdmin.auth.admin.generateLink({
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
    });

    let linkData = inviteRes.data;
    let linkError = inviteRes.error;

    if (linkError || !linkData?.properties?.action_link) {
      console.warn("Invite link failed, falling back to recovery:", linkError);
      linkType = "recovery";
      const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      linkError = recoveryRes.error;
      linkData = recoveryRes.data;
      if (linkError || !linkData?.properties?.action_link) {
        console.error("Error generating recovery link:", linkError);
        throw new Error(
          `Impossibile generare il link: ${linkError?.message || "errore sconosciuto"}`
        );
      }
    }

    const userId = linkData.user.id;
    const actionLink = linkData.properties.action_link;

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
                ? "Hai ricevuto un invito per accedere al portale clienti."
                : "Hai richiesto di reimpostare la password del portale clienti."
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

    console.log("Email sent via Resend:", { id: emailResponse?.data?.id, linkType });

    // Update the client record with the user ID
    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ client_user_id: userId })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating client with user ID:", updateError);
      throw new Error(`Impossibile collegare l'utente al cliente: ${updateError.message}`);
    }

    console.log("Client record updated with user ID", userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: "Invito inviato con successo",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-client-account:", error);
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
