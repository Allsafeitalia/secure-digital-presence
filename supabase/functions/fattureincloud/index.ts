import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIC_BASE = "https://api-v2.fattureincloud.it";

const TOKEN = Deno.env.get("FATTUREINCLOUD_ACCESS_TOKEN") ?? "";
const COMPANY_ID = Deno.env.get("FATTUREINCLOUD_COMPANY_ID") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function fic(path: string, init: RequestInit = {}) {
  const res = await fetch(`${FIC_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Fatture in Cloud ${res.status}: ${data?.error?.message ?? data?.message ?? text.slice(0, 300)}`,
    );
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!TOKEN) return json({ error: "Token Fatture in Cloud non configurato" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- auth: admin only ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Non autenticato" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Accesso riservato agli amministratori" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action ?? "test");

    // --- test connection / list companies ---
    if (action === "test") {
      const companies = await fic("/user/companies");
      return json({ ok: true, companyId: COMPANY_ID, companies: companies?.data ?? null });
    }

    if (!COMPANY_ID) return json({ error: "Company ID Fatture in Cloud non configurato" }, 500);

    // --- create invoice on Fatture in Cloud ---
    if (action === "create_invoice") {
      const invoiceId = String(body.invoice_id ?? "");
      if (!invoiceId) return json({ error: "invoice_id mancante" }, 400);

      const { data: inv, error: invErr } = await admin
        .from("invoices")
        .select("*, clients(*)")
        .eq("id", invoiceId)
        .maybeSingle();
      if (invErr || !inv) return json({ error: "Fattura non trovata" }, 404);
      if (inv.fic_document_id) {
        return json({ ok: true, alreadyExists: true, fic_document_id: inv.fic_document_id, fic_url: inv.fic_url });
      }

      const c: any = inv.clients ?? {};
      const total = Number(inv.total_amount ?? 0);
      const vatId = Number(body.vat_id ?? 0); // 0 = 22% nel default FIC
      const net = vatId === 0 ? Number((total / 1.22).toFixed(2)) : total;

      const payload = {
        data: {
          type: "invoice",
          entity: {
            name: c.ragione_sociale || c.name,
            vat_number: c.partita_iva || undefined,
            address_street: c.address || undefined,
            address_postal_code: c.postal_code || undefined,
            address_city: c.city || undefined,
            address_province: c.province || undefined,
            country: c.country || "Italia",
            email: c.email && !String(c.email).endsWith("@da-completare.local") ? c.email : undefined,
            certified_email: c.pec || undefined,
            ei_code: c.codice_sdi || undefined,
          },
          date: inv.invoice_date,
          number: Number(String(inv.invoice_number).split("/")[0]) || undefined,
          subject: inv.description || undefined,
          visible_subject: inv.description || undefined,
          items_list: [
            {
              name: inv.description || "Servizi informatici",
              qty: 1,
              net_price: net,
              vat: { id: vatId },
            },
          ],
          payments_list: [
            {
              amount: total,
              due_date: inv.invoice_date,
              paid_date: inv.payment_status === "paid" ? inv.payment_date ?? inv.invoice_date : null,
              status: inv.payment_status === "paid" ? "paid" : "not_paid",
            },
          ],
        },
      };

      const created = await fic(`/c/${COMPANY_ID}/issued_documents`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const doc = created?.data ?? {};
      await admin
        .from("invoices")
        .update({
          fic_document_id: doc.id,
          fic_url: doc.url ?? doc.next_due_date_url ?? null,
          fic_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return json({ ok: true, fic_document_id: doc.id, fic_url: doc.url ?? null });
    }

    // --- sync payment status back from Fatture in Cloud ---
    if (action === "sync") {
      const clientId = body.client_id ? String(body.client_id) : null;
      let q = admin.from("invoices").select("id, fic_document_id, payment_status").not("fic_document_id", "is", null);
      if (clientId) q = q.eq("client_id", clientId);
      const { data: rows, error } = await q;
      if (error) return json({ error: error.message }, 500);

      let updated = 0;
      for (const row of rows ?? []) {
        try {
          const res = await fic(`/c/${COMPANY_ID}/issued_documents/${row.fic_document_id}`);
          const doc = res?.data ?? {};
          const payments: any[] = doc.payments_list ?? [];
          const allPaid = payments.length > 0 && payments.every((p) => p.status === "paid");
          const paidDate = payments.find((p) => p.paid_date)?.paid_date ?? null;
          const newStatus = allPaid ? "paid" : "pending";
          const patch: Record<string, unknown> = {
            fic_synced_at: new Date().toISOString(),
            fic_url: doc.url ?? undefined,
          };
          if (newStatus !== row.payment_status) {
            patch.payment_status = newStatus;
            patch.payment_date = allPaid ? paidDate : null;
            updated++;
          }
          await admin.from("invoices").update(patch).eq("id", row.id);
        } catch (e) {
          console.error("Sync error for invoice", row.id, e);
        }
      }
      return json({ ok: true, checked: rows?.length ?? 0, updated });
    }

    return json({ error: "Azione non valida" }, 400);
  } catch (e) {
    console.error("fattureincloud error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
