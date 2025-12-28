-- Create enum for service types
CREATE TYPE public.service_type AS ENUM (
  'website',
  'domain',
  'hosting',
  'backup',
  'email',
  'ssl',
  'maintenance',
  'other'
);

-- Create enum for billing cycle
CREATE TYPE public.billing_cycle AS ENUM (
  'monthly',
  'quarterly',
  'biannual',
  'yearly',
  'one_time'
);

-- Create enum for service status
CREATE TYPE public.service_status AS ENUM (
  'active',
  'expiring_soon',
  'expired',
  'suspended',
  'cancelled'
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.contact_tickets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  ragione_sociale TEXT,
  partita_iva TEXT,
  codice_sdi TEXT,
  pec TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Italia',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_services table
CREATE TABLE public.client_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  server_name TEXT,
  domain_name TEXT,
  expiration_date DATE,
  billing_cycle billing_cycle NOT NULL DEFAULT 'yearly',
  status service_status NOT NULL DEFAULT 'active',
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients (admin only)
CREATE POLICY "Only admins can view clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create clients"
ON public.clients
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update clients"
ON public.clients
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete clients"
ON public.clients
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for client_services (admin only)
CREATE POLICY "Only admins can view services"
ON public.client_services
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create services"
ON public.client_services
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update services"
ON public.client_services
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete services"
ON public.client_services
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_services_updated_at
BEFORE UPDATE ON public.client_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();