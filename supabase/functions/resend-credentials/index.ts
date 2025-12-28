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

const generateTemporaryPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("resend-credentials function called", { method: req.method });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const resend = new Resend(resendApiKey);

    const { clientId, email, name }: ResendCredentialsRequest = await req.json();
    console.log(`Processing credentials for client: ${name} (${email})`);

    // Fetch the client to get the user ID
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("client_user_id")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("Client not found:", clientError);
      throw new Error("Client not found.");
    }

    // Generate new temporary password
    const temporaryPassword = generateTemporaryPassword();
    console.log("Generated new temporary password");

    let userId = clientData?.client_user_id;

    // If no user account exists, create one
    if (!userId) {
      console.log("No user account found, creating new one...");
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name,
          client_id: clientId,
          is_client: true,
        },
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      userId = authData.user.id;
      console.log("Auth user created:", userId);

      // Update the client record with the user ID
      const { error: updateError } = await supabaseAdmin
        .from("clients")
        .update({ client_user_id: userId })
        .eq("id", clientId);

      if (updateError) {
        console.error("Error updating client with user ID:", updateError);
        // Clean up the created user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to link user to client: ${updateError.message}`);
      }

      console.log("Client record updated with user ID");
    } else {
      // Update existing user password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: temporaryPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        throw new Error(`Failed to reset password: ${updateError.message}`);
      }

      console.log("Password updated for user:", userId);
    }

    // Get the site URL for the email
    const siteUrl = Deno.env.get("SITE_URL") || "https://kthxektvgaidqjetjsur.lovableproject.com";

    // Send email with new credentials
    const { error: emailError } = await resend.emails.send({
      from: "Assistenza <onboarding@resend.dev>",
      to: [email],
      subject: userId === clientData?.client_user_id ? "Le tue nuove credenziali di accesso" : "Benvenuto - Le tue credenziali di accesso",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${userId === clientData?.client_user_id ? 'Nuove Credenziali' : `Benvenuto, ${name}!`}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Ciao ${name},</p>
            <p>${userId === clientData?.client_user_id 
              ? 'Abbiamo generato una nuova password per il tuo account. Utilizza le credenziali qui sotto per accedere.'
              : 'Il tuo account è stato creato con successo. Puoi accedere al tuo pannello di controllo per monitorare lo stato dei tuoi servizi.'
            }</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; color: #4f46e5;">Le tue credenziali</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              ⚠️ <strong>Importante:</strong> Ti consigliamo di cambiare la password dopo il primo accesso.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${siteUrl}/client-login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Accedi al Pannello
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Questa email è stata inviata automaticamente. Per assistenza, rispondi a questa email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      const details =
        (emailError as any)?.message ??
        (typeof emailError === "string" ? emailError : undefined) ??
        JSON.stringify(emailError);
      throw new Error(`Invio email fallito: ${details}`);
    }
    
    console.log("Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: userId === clientData?.client_user_id ? "New credentials sent successfully" : "Account created and credentials sent" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-credentials:", error);
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
