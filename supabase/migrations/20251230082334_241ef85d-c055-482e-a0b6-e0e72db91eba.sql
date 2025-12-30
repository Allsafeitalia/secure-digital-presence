-- Block anonymous access to clients table
CREATE POLICY "Block anonymous client reads" 
ON public.clients 
FOR SELECT 
TO anon
USING (false);

-- Block anonymous access to email_settings table as well
CREATE POLICY "Block anonymous email settings reads" 
ON public.email_settings 
FOR SELECT 
TO anon
USING (false);