-- Allow service role to read email settings (for edge functions)
CREATE POLICY "Service role can read email settings"
ON public.email_settings
FOR SELECT
USING (true);