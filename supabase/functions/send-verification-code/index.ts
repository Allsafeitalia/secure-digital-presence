import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendCodeRequest {
  email: string;
  purpose: "login" | "contact_verification";
  clientName?: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, purpose, clientName }: SendCodeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate OTP code
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing codes for this email and purpose
    await supabaseAdmin
      .from("verification_codes")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("purpose", purpose);

    // Insert new code
    const { error: insertError } = await supabaseAdmin
      .from("verification_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      throw new Error("Failed to create verification code");
    }

    // Send email with OTP code only (no magic link)
    const emailResponse = await resend.emails.send({
      from: "My Trusted Tech <noreply@giuseppemastronardi.dev>",
      to: [email],
      subject: `Il tuo codice di verifica: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; text-align: center;">
                      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">🔐</span>
                      </div>
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1a1a2e;">
                        Codice di Verifica
                      </h1>
                      ${clientName ? `<p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280;">Ciao ${clientName}!</p>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                        Ecco il tuo codice di verifica. Inseriscilo nell'app per continuare.
                      </p>
                      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1; font-family: 'Courier New', monospace;">
                          ${code}
                        </div>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                        ⏱️ Il codice scade tra <strong>5 minuti</strong>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 16px 16px;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                        Se non hai richiesto questo codice, puoi ignorare questa email.<br>
                        Non condividere mai questo codice con nessuno.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
