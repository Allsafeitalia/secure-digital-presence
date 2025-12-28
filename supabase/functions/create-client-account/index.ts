import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Get the site URL for the redirect
    const siteUrl = Deno.env.get("SITE_URL") || "https://kthxektvgaidqjetjsur.lovableproject.com";
    const redirectTo = `${siteUrl}/client-login`;

    // Invite user by email - Supabase will send the invite email automatically
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          name,
          client_id: clientId,
          is_client: true,
        },
      }
    );

    if (authError) {
      console.error("Error inviting user:", authError);
      throw new Error(`Impossibile inviare l'invito: ${authError.message}`);
    }

    console.log("User invited:", authData.user.id);

    // Update the client record with the user ID
    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ client_user_id: authData.user.id })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating client with user ID:", updateError);
      // Clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Impossibile collegare l'utente al cliente: ${updateError.message}`);
    }

    console.log("Client record updated with user ID");

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
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
