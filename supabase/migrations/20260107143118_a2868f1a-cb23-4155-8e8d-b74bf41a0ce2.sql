-- Add order_number to client_services
ALTER TABLE public.client_services 
ADD COLUMN order_number TEXT UNIQUE;

-- Add order_number to maintenance_requests  
ALTER TABLE public.maintenance_requests 
ADD COLUMN order_number TEXT UNIQUE;

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  seq_num INTEGER;
  new_order_number TEXT;
BEGIN
  -- Determine prefix based on table
  IF TG_TABLE_NAME = 'client_services' THEN
    prefix := 'SRV';
  ELSE
    prefix := 'HLP';
  END IF;
  
  year_part := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for this year and type
  IF TG_TABLE_NAME = 'client_services' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM public.client_services
    WHERE order_number LIKE prefix || year_part || '%';
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM public.maintenance_requests
    WHERE order_number LIKE prefix || year_part || '%';
  END IF;
  
  new_order_number := prefix || year_part || LPAD(seq_num::TEXT, 5, '0');
  NEW.order_number := new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic order number generation
CREATE TRIGGER generate_service_order_number
BEFORE INSERT ON public.client_services
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER generate_maintenance_order_number
BEFORE INSERT ON public.maintenance_requests
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION public.generate_order_number();