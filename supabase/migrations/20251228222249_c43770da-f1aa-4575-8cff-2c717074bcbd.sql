-- Add client_user_id column to clients table to link with auth.users
ALTER TABLE public.clients 
ADD COLUMN client_user_id uuid UNIQUE;

-- Add monitoring fields to client_services
ALTER TABLE public.client_services 
ADD COLUMN url_to_monitor text,
ADD COLUMN last_check_at timestamp with time zone,
ADD COLUMN is_online boolean DEFAULT true,
ADD COLUMN last_response_time_ms integer,
ADD COLUMN last_error text;

-- Create service_monitoring_logs table for history
CREATE TABLE public.service_monitoring_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id uuid NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
    checked_at timestamp with time zone NOT NULL DEFAULT now(),
    is_online boolean NOT NULL,
    response_time_ms integer,
    status_code integer,
    error_message text
);

-- Enable RLS on monitoring logs
ALTER TABLE public.service_monitoring_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all monitoring logs
CREATE POLICY "Admins can view monitoring logs" 
ON public.service_monitoring_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clients can view their own service monitoring logs
CREATE POLICY "Clients can view own service monitoring logs" 
ON public.service_monitoring_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.client_services cs
        JOIN public.clients c ON cs.client_id = c.id
        WHERE cs.id = service_monitoring_logs.service_id
        AND c.client_user_id = auth.uid()
    )
);

-- Admins can insert monitoring logs
CREATE POLICY "Admins can insert monitoring logs" 
ON public.service_monitoring_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service account to insert logs (for edge function)
CREATE POLICY "Service role can insert monitoring logs" 
ON public.service_monitoring_logs 
FOR INSERT 
WITH CHECK (true);

-- Add RLS policy for clients to view their own data
CREATE POLICY "Clients can view own client data" 
ON public.clients 
FOR SELECT 
USING (client_user_id = auth.uid());

-- Add RLS policy for clients to view their own services
CREATE POLICY "Clients can view own services" 
ON public.client_services 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = client_services.client_id
        AND c.client_user_id = auth.uid()
    )
);

-- Create index for faster monitoring queries
CREATE INDEX idx_monitoring_logs_service_id ON public.service_monitoring_logs(service_id);
CREATE INDEX idx_monitoring_logs_checked_at ON public.service_monitoring_logs(checked_at DESC);
CREATE INDEX idx_client_services_url_monitor ON public.client_services(url_to_monitor) WHERE url_to_monitor IS NOT NULL;