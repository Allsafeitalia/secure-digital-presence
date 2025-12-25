-- Drop and recreate SELECT policy with explicit auth check
DROP POLICY IF EXISTS "Only admins can view tickets" ON public.contact_tickets;

CREATE POLICY "Only admins can view tickets" 
ON public.contact_tickets 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update other policies to also require authenticated role explicitly
DROP POLICY IF EXISTS "Only admins can update tickets" ON public.contact_tickets;

CREATE POLICY "Only admins can update tickets" 
ON public.contact_tickets 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete tickets" ON public.contact_tickets;

CREATE POLICY "Only admins can delete tickets" 
ON public.contact_tickets 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));