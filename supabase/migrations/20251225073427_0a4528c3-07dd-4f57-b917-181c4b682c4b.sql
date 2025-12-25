-- Drop existing insecure policies
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.contact_tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.contact_tickets;
DROP POLICY IF EXISTS "Authenticated users can delete tickets" ON public.contact_tickets;

-- Create admin-only policies
CREATE POLICY "Only admins can view tickets" 
ON public.contact_tickets 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update tickets" 
ON public.contact_tickets 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete tickets" 
ON public.contact_tickets 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));