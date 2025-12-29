-- Create email_settings table for configurable email parameters
CREATE TABLE public.email_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Only admins can view email settings"
ON public.email_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update settings
CREATE POLICY "Only admins can update email settings"
ON public.email_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Only admins can insert email settings"
ON public.email_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete settings
CREATE POLICY "Only admins can delete email settings"
ON public.email_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON public.email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default values
INSERT INTO public.email_settings (setting_key, setting_value, description) VALUES
  ('RESEND_FROM', 'Starter Kit <onboarding@resend.dev>', 'Indirizzo email mittente (es: Nome <email@dominio.com>)'),
  ('SITE_URL', 'https://preview--starter-kit-alessandr0.lovable.app', 'URL del sito per i redirect nelle email');