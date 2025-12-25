-- Add phone number column to contact_tickets
ALTER TABLE public.contact_tickets 
ADD COLUMN phone text;