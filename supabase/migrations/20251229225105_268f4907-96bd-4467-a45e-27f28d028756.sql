-- Add auto_renew field to client_services (default true)
ALTER TABLE public.client_services
ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true;

-- Create table for service cancellation requests
CREATE TABLE public.service_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid
);

-- Enable RLS
ALTER TABLE public.service_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Clients can view their own cancellation requests
CREATE POLICY "Clients can view own cancellation requests"
ON public.service_cancellation_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = service_cancellation_requests.client_id
    AND c.client_user_id = auth.uid()
  )
);

-- RLS: Clients can create cancellation requests for their services
CREATE POLICY "Clients can create cancellation requests"
ON public.service_cancellation_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = service_cancellation_requests.client_id
    AND c.client_user_id = auth.uid()
  )
);

-- RLS: Admins can view all cancellation requests
CREATE POLICY "Admins can view all cancellation requests"
ON public.service_cancellation_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Admins can update cancellation requests
CREATE POLICY "Admins can update cancellation requests"
ON public.service_cancellation_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Admins can delete cancellation requests
CREATE POLICY "Admins can delete cancellation requests"
ON public.service_cancellation_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));