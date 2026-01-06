-- Add payment tracking fields to client_services
ALTER TABLE public.client_services
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'awaiting_transfer')),
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer')),
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_notes TEXT;

-- Add payment tracking fields to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'awaiting_transfer')),
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer')),
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_notes TEXT;

-- Create indexes for payment queries
CREATE INDEX idx_client_services_payment_status ON public.client_services(payment_status);
CREATE INDEX idx_maintenance_requests_payment_status ON public.maintenance_requests(payment_status);