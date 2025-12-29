-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can read email settings" ON public.email_settings;

-- The service role bypasses RLS anyway, so we don't need a special policy.
-- Edge functions using service_role_key will automatically bypass RLS.