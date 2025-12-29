-- Create maintenance/support requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL DEFAULT 'maintenance' CHECK (request_type IN ('maintenance', 'support', 'update', 'bug_fix')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'scheduled', 'closed', 'resolved', 'not_resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  what_was_done TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can do everything on maintenance requests"
ON public.maintenance_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = maintenance_requests.client_id
  AND c.client_user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();