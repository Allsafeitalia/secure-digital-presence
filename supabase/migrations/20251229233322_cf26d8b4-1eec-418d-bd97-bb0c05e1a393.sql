-- Drop existing policies on clients table
DROP POLICY IF EXISTS "Clients can view own client data" ON public.clients;
DROP POLICY IF EXISTS "Only admins can create clients" ON public.clients;
DROP POLICY IF EXISTS "Only admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Only admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Only admins can view clients" ON public.clients;

-- Recreate policies with explicit authentication checks
-- Clients can view their own data (requires authentication AND matching user_id)
CREATE POLICY "Authenticated clients can view own data" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (client_user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Admins can view all clients (requires authentication AND admin role)
CREATE POLICY "Authenticated admins can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Only authenticated admins can create clients
CREATE POLICY "Authenticated admins can create clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Only authenticated admins can update clients
CREATE POLICY "Authenticated admins can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Only authenticated admins can delete clients
CREATE POLICY "Authenticated admins can delete clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));