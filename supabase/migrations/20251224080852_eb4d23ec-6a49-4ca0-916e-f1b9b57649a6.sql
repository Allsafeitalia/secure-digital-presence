-- Create contact tickets table
CREATE TABLE public.contact_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_tickets ENABLE ROW LEVEL SECURITY;

-- Public can insert tickets (contact form)
CREATE POLICY "Anyone can create tickets" 
ON public.contact_tickets 
FOR INSERT 
WITH CHECK (true);

-- Only authenticated users can view tickets (admin)
CREATE POLICY "Authenticated users can view tickets" 
ON public.contact_tickets 
FOR SELECT 
TO authenticated
USING (true);

-- Only authenticated users can update tickets (admin)
CREATE POLICY "Authenticated users can update tickets" 
ON public.contact_tickets 
FOR UPDATE 
TO authenticated
USING (true);

-- Only authenticated users can delete tickets (admin)
CREATE POLICY "Authenticated users can delete tickets" 
ON public.contact_tickets 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contact_tickets_updated_at
BEFORE UPDATE ON public.contact_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_tickets;