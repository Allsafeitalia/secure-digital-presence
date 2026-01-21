-- Create analytics_visits table to store visitor data
CREATE TABLE public.analytics_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  
  -- Visit info
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_url TEXT NOT NULL,
  page_title TEXT,
  
  -- Visitor info
  visitor_id TEXT NOT NULL, -- fingerprint/session ID
  session_id TEXT NOT NULL,
  
  -- Device info
  device_type TEXT NOT NULL DEFAULT 'desktop', -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  
  -- Referrer info
  referrer_url TEXT,
  referrer_source TEXT, -- google, instagram, facebook, direct, etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Geo info (from IP - we'll get this server-side)
  country TEXT,
  city TEXT,
  
  -- Performance
  load_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics daily aggregates for faster queries
CREATE TABLE public.analytics_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Counts
  total_visits INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  
  -- Device breakdown
  mobile_visits INTEGER NOT NULL DEFAULT 0,
  tablet_visits INTEGER NOT NULL DEFAULT 0,
  desktop_visits INTEGER NOT NULL DEFAULT 0,
  
  -- Top referrers (stored as JSONB for flexibility)
  referrer_breakdown JSONB DEFAULT '{}',
  
  -- Page views (stored as JSONB)
  page_breakdown JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, date)
);

-- Create API keys table for clients to authenticate their tracking script
CREATE TABLE public.analytics_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_analytics_visits_client_id ON public.analytics_visits(client_id);
CREATE INDEX idx_analytics_visits_visited_at ON public.analytics_visits(visited_at);
CREATE INDEX idx_analytics_visits_client_date ON public.analytics_visits(client_id, visited_at);
CREATE INDEX idx_analytics_daily_stats_client_date ON public.analytics_daily_stats(client_id, date);
CREATE INDEX idx_analytics_api_keys_key ON public.analytics_api_keys(api_key);

-- Enable RLS
ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_visits
CREATE POLICY "Clients can view own analytics"
ON public.analytics_visits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = analytics_visits.client_id
  AND c.client_user_id = auth.uid()
));

CREATE POLICY "Admins can view all analytics"
ON public.analytics_visits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert analytics"
ON public.analytics_visits FOR INSERT
WITH CHECK (true);

-- RLS Policies for analytics_daily_stats
CREATE POLICY "Clients can view own daily stats"
ON public.analytics_daily_stats FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = analytics_daily_stats.client_id
  AND c.client_user_id = auth.uid()
));

CREATE POLICY "Admins can view all daily stats"
ON public.analytics_daily_stats FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage daily stats"
ON public.analytics_daily_stats FOR ALL
WITH CHECK (true);

-- RLS Policies for analytics_api_keys
CREATE POLICY "Clients can view own API keys"
ON public.analytics_api_keys FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = analytics_api_keys.client_id
  AND c.client_user_id = auth.uid()
));

CREATE POLICY "Admins can manage all API keys"
ON public.analytics_api_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on daily stats
CREATE TRIGGER update_analytics_daily_stats_updated_at
BEFORE UPDATE ON public.analytics_daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();