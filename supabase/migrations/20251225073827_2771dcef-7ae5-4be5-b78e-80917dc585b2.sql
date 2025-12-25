-- Drop if exists and recreate to block anonymous reads
DROP POLICY IF EXISTS "Block anonymous ticket reads" ON public.contact_tickets;

CREATE POLICY "Block anonymous ticket reads"
ON public.contact_tickets
FOR SELECT
TO anon
USING (false);