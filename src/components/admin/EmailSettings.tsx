import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Globe, Save, Loader2 } from "lucide-react";

interface EmailSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

export function EmailSettings() {
  const sb = supabase as any;

  const [settings, setSettings] = useState<EmailSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [pingResult, setPingResult] = useState<
    | { ok: true; time: string; received?: { hasAuthHeader: boolean; hasApiKey: boolean } }
    | { ok: false; error: string }
    | null
  >(null);


  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await sb
        .from("email_settings")
        .select("*")
        .order("setting_key");

      if (error) throw error;

      setSettings(data || []);
      const values: Record<string, string> = {};
      data?.forEach((s) => {
        values[s.setting_key] = s.setting_value;
      });
      setFormValues(values);
    } catch (error: any) {
      console.error("Error fetching email settings:", error);
      const msg = String(error?.message ?? "");
      toast.error(/jwt/i.test(msg) ? "Accesso richiesto: effettua il login admin" : "Errore nel caricamento delle impostazioni");
    } finally {
      setLoading(false);
    }
  };


  const testPing = async () => {
    setPingResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ping", {
        body: { source: "admin-email-settings", ts: Date.now() },
      });
      if (error) throw error;
      setPingResult({ ok: true, time: data?.time ?? new Date().toISOString(), received: data?.received });
      toast.success("Ping OK: la funzione risponde correttamente");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setPingResult({ ok: false, error: msg });
      toast.error(`Ping fallito: ${msg}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const newValue = formValues[setting.setting_key];
        if (newValue !== setting.setting_value) {
          const { error } = await sb
            .from("email_settings")
            .update({ setting_value: newValue })
            .eq("id", setting.id);

          if (error) throw error;
        }
      }

      toast.success("Impostazioni salvate con successo");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving email settings:", error);
      const msg = String(error?.message ?? "");
      toast.error(
        /jwt/i.test(msg)
          ? "Accesso richiesto: effettua il login admin"
          : "Errore nel salvataggio delle impostazioni"
      );
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (key: string) => {
    switch (key) {
      case "RESEND_FROM":
        return <Mail className="h-5 w-5 text-muted-foreground" />;
      case "SITE_URL":
        return <Globe className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getLabel = (key: string) => {
    switch (key) {
      case "RESEND_FROM":
        return "Indirizzo Mittente";
      case "SITE_URL":
        return "URL Sito (Redirect)";
      default:
        return key;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Impostazioni Email
          </CardTitle>
          <CardDescription>
            Configura le impostazioni per l'invio delle email ai clienti.
            Queste impostazioni vengono utilizzate dalle funzioni di invio credenziali.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <Label htmlFor={setting.setting_key} className="flex items-center gap-2">
                {getIcon(setting.setting_key)}
                {getLabel(setting.setting_key)}
              </Label>
              <Input
                id={setting.setting_key}
                value={formValues[setting.setting_key] || ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [setting.setting_key]: e.target.value,
                  }))
                }
                placeholder={setting.description || ""}
              />
              {setting.description && (
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              )}
            </div>
          ))}

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salva Impostazioni
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostica</CardTitle>
          <CardDescription>
            Test rapido per verificare che le funzioni backend siano raggiungibili dal browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={testPing}>
            Test API (ping)
          </Button>

          {pingResult && (
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              {pingResult.ok ? (
                <>
                  <p><strong>Esito:</strong> OK</p>
                  <p><strong>Ora server:</strong> {pingResult.time}</p>
                  <p className="text-muted-foreground">
                    Headers ricevuti: auth={String(pingResult.received?.hasAuthHeader ?? false)}, apikey={String(pingResult.received?.hasApiKey ?? false)}
                  </p>
                </>
              ) : (
                <>
                  <p><strong>Esito:</strong> KO</p>
                  <p className="text-muted-foreground">{pingResult.error}</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni SMTP</CardTitle>
          <CardDescription>
            Le email vengono inviate tramite Resend. La chiave API è già configurata nei secrets del progetto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <p><strong>Provider:</strong> Resend</p>
            <p><strong>Stato:</strong> <span className="text-green-600">Configurato</span></p>
            <p className="text-muted-foreground">
              Per modificare la chiave API di Resend, contatta l'amministratore del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

