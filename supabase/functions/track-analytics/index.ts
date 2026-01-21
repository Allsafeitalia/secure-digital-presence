import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TrackingPayload {
  api_key: string;
  page_url: string;
  page_title?: string;
  visitor_id: string;
  session_id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  screen_width?: number;
  screen_height?: number;
  referrer_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  load_time_ms?: number;
}

function detectReferrerSource(referrer: string | null): string {
  if (!referrer) return 'direct';
  
  const url = referrer.toLowerCase();
  
  if (url.includes('google.')) return 'google';
  if (url.includes('instagram.com') || url.includes('l.instagram.com')) return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('l.facebook.com')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('t.co') || url.includes('x.com')) return 'twitter';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('pinterest.')) return 'pinterest';
  if (url.includes('bing.com')) return 'bing';
  if (url.includes('yahoo.')) return 'yahoo';
  if (url.includes('duckduckgo.')) return 'duckduckgo';
  
  // Extract domain for other referrers
  try {
    const domain = new URL(referrer).hostname.replace('www.', '');
    return domain;
  } catch {
    return 'other';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TrackingPayload = await req.json();
    
    // Validate API key
    if (!payload.api_key) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('analytics_api_keys')
      .select('id, client_id, is_active')
      .eq('api_key', payload.api_key)
      .single();

    if (apiKeyError || !apiKeyData || !apiKeyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = apiKeyData.client_id;
    const referrerSource = detectReferrerSource(payload.referrer_url || null);

    // Insert the visit
    const { error: insertError } = await supabase
      .from('analytics_visits')
      .insert({
        client_id: clientId,
        page_url: payload.page_url,
        page_title: payload.page_title,
        visitor_id: payload.visitor_id,
        session_id: payload.session_id,
        device_type: payload.device_type,
        browser: payload.browser,
        os: payload.os,
        screen_width: payload.screen_width,
        screen_height: payload.screen_height,
        referrer_url: payload.referrer_url,
        referrer_source: referrerSource,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        load_time_ms: payload.load_time_ms,
      });

    if (insertError) {
      console.error('Error inserting visit:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to track visit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at on API key
    await supabase
      .from('analytics_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Update daily stats (upsert)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingStats } = await supabase
      .from('analytics_daily_stats')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', today)
      .single();

    if (existingStats) {
      // Update existing stats
      const deviceField = `${payload.device_type}_visits`;
      const referrerBreakdown = existingStats.referrer_breakdown || {};
      referrerBreakdown[referrerSource] = (referrerBreakdown[referrerSource] || 0) + 1;
      
      const pageBreakdown = existingStats.page_breakdown || {};
      pageBreakdown[payload.page_url] = (pageBreakdown[payload.page_url] || 0) + 1;

      await supabase
        .from('analytics_daily_stats')
        .update({
          total_visits: existingStats.total_visits + 1,
          [deviceField]: (existingStats[deviceField as keyof typeof existingStats] as number || 0) + 1,
          referrer_breakdown: referrerBreakdown,
          page_breakdown: pageBreakdown,
        })
        .eq('id', existingStats.id);
    } else {
      // Create new daily stats
      const referrerBreakdown: Record<string, number> = { [referrerSource]: 1 };
      const pageBreakdown: Record<string, number> = { [payload.page_url]: 1 };
      
      await supabase
        .from('analytics_daily_stats')
        .insert({
          client_id: clientId,
          date: today,
          total_visits: 1,
          unique_visitors: 1,
          mobile_visits: payload.device_type === 'mobile' ? 1 : 0,
          tablet_visits: payload.device_type === 'tablet' ? 1 : 0,
          desktop_visits: payload.device_type === 'desktop' ? 1 : 0,
          referrer_breakdown: referrerBreakdown,
          page_breakdown: pageBreakdown,
        });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tracking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
