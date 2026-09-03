ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS invoice_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;