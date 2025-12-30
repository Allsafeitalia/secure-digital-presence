-- Drop the existing blocking policies that create conflicts
DROP POLICY IF EXISTS "Block anonymous client reads" ON public.clients;
DROP POLICY IF EXISTS "Block anonymous email settings reads" ON public.email_settings;
DROP POLICY IF EXISTS "Block anonymous ticket reads" ON public.contact_tickets;

-- For clients table: Convert existing SELECT policies to PERMISSIVE so they work correctly
-- First drop the restrictive policies
DROP POLICY IF EXISTS "Authenticated clients can view own data" ON public.clients;
DROP POLICY IF EXISTS "Authenticated admins can view all clients" ON public.clients;

-- Recreate as PERMISSIVE policies (default) with proper auth checks
CREATE POLICY "Authenticated clients can view own data" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (client_user_id = auth.uid());

CREATE POLICY "Authenticated admins can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- For contact_tickets: Fix the blocking policy
DROP POLICY IF EXISTS "Only admins can view tickets" ON public.contact_tickets;

-- Recreate as proper authenticated-only policy
CREATE POLICY "Only admins can view tickets" 
ON public.contact_tickets 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- For email_settings: Ensure proper access control
DROP POLICY IF EXISTS "Only admins can view email settings" ON public.email_settings;

CREATE POLICY "Only admins can view email settings" 
ON public.email_settings 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));