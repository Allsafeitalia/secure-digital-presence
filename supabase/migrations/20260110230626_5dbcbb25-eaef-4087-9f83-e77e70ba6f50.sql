-- Add client_code column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Create function to generate client code
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Get the next number by counting existing clients + 1
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.clients
  WHERE client_code IS NOT NULL AND client_code ~ '^CLI[0-9]+$';
  
  -- Generate the code with padding (CLI00001 format)
  new_code := 'CLI' || LPAD(next_number::TEXT, 5, '0');
  
  NEW.client_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for new clients
DROP TRIGGER IF EXISTS set_client_code ON public.clients;
CREATE TRIGGER set_client_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  WHEN (NEW.client_code IS NULL)
  EXECUTE FUNCTION public.generate_client_code();

-- Generate codes for existing clients that don't have one
DO $$
DECLARE
  client_record RECORD;
  counter INTEGER := 1;
BEGIN
  -- Get the current max number
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 4) AS INTEGER)), 0)
  INTO counter
  FROM public.clients
  WHERE client_code IS NOT NULL AND client_code ~ '^CLI[0-9]+$';
  
  -- Update clients without codes
  FOR client_record IN 
    SELECT id FROM public.clients 
    WHERE client_code IS NULL 
    ORDER BY created_at ASC
  LOOP
    counter := counter + 1;
    UPDATE public.clients 
    SET client_code = 'CLI' || LPAD(counter::TEXT, 5, '0')
    WHERE id = client_record.id;
  END LOOP;
END $$;

-- Create function to lookup client by code, email or phone (for public access)
CREATE OR REPLACE FUNCTION public.lookup_client_for_ticket(
  p_client_code TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  code TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.client_code
  FROM public.clients c
  WHERE c.is_active = true
    AND (
      (p_client_code IS NOT NULL AND c.client_code = UPPER(TRIM(p_client_code)))
      OR (p_email IS NOT NULL AND LOWER(c.email) = LOWER(TRIM(p_email)))
      OR (p_phone IS NOT NULL AND c.phone LIKE '%' || REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g') || '%')
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anonymous users for the lookup function
GRANT EXECUTE ON FUNCTION public.lookup_client_for_ticket TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_client_for_ticket TO authenticated;