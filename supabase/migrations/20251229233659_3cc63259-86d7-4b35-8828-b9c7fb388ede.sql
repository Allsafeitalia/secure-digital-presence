-- Add cost column to maintenance_requests table
ALTER TABLE public.maintenance_requests 
ADD COLUMN cost numeric DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN public.maintenance_requests.cost IS 'Cost of the maintenance intervention in euros';