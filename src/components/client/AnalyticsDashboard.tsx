import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  Eye, Users, Smartphone, Monitor, Tablet, 
  TrendingUp, Globe, Copy, Check, RefreshCw, Code
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface AnalyticsDashboardProps {
  clientId: string;
}

interface DailyStats {
  date: string;
  total_visits: number;
  unique_visitors: number;
  mobile_visits: number;
  tablet_visits: number;
  desktop_visits: number;
  referrer_breakdown: Record<string, number>;
  page_breakdown: Record<string, number>;
}

interface ApiKey {
  id: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const referrerLabels: Record<string, string> = {
  direct: 'Traffico Diretto',
  google: 'Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  bing: 'Bing',
  yahoo: 'Yahoo',
  duckduckgo: 'DuckDuckGo',
  other: 'Altri',
};

export function AnalyticsDashboard({ clientId }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch last 30 days stats
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      
      const { data: statsData, error: statsError } = await supabase
        .from('analytics_daily_stats')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true });

      if (statsError) throw statsError;

      // Safely cast the data with proper type handling
      const typedStats: DailyStats[] = (statsData || []).map(item => ({
        date: item.date,
        total_visits: item.total_visits,
        unique_visitors: item.unique_visitors,
        mobile_visits: item.mobile_visits,
        tablet_visits: item.tablet_visits,
        desktop_visits: item.desktop_visits,
        referrer_breakdown: (item.referrer_breakdown as Record<string, number>) || {},
        page_breakdown: (item.page_breakdown as Record<string, number>) || {},
      }));
      
      setStats(typedStats);

      // Fetch API keys
      const { data: keysData, error: keysError } = await supabase
        .from('analytics_api_keys')
        .select('*')
        .eq('client_id', clientId);

      if (keysError) throw keysError;
      setApiKeys(keysData || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le statistiche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  // Calculate totals
  const totals = stats.reduce((acc, day) => ({
    visits: acc.visits + day.total_visits,
    unique: acc.unique + day.unique_visitors,
    mobile: acc.mobile + day.mobile_visits,
    tablet: acc.tablet + day.tablet_visits,
    desktop: acc.desktop + day.desktop_visits,
  }), { visits: 0, unique: 0, mobile: 0, tablet: 0, desktop: 0 });

  // Aggregate referrer data
  const referrerData = stats.reduce((acc, day) => {
    Object.entries(day.referrer_breakdown || {}).forEach(([source, count]) => {
      acc[source] = (acc[source] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(referrerData)
    .map(([name, value]) => ({ 
      name: referrerLabels[name] || name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Device breakdown for pie chart
  const deviceData = [
    { name: 'Desktop', value: totals.desktop, icon: Monitor },
    { name: 'Mobile', value: totals.mobile, icon: Smartphone },
    { name: 'Tablet', value: totals.tablet, icon: Tablet },
  ].filter(d => d.value > 0);

  // Chart data for line chart
  const chartData = stats.map(day => ({
    date: format(new Date(day.date), 'dd/MM', { locale: it }),
    visite: day.total_visits,
    visitatori: day.unique_visitors,
  }));

  const copyApiKey = async () => {
    if (apiKeys.length > 0) {
      await navigator.clipboard.writeText(apiKeys[0].api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiato!",
        description: "API key copiata negli appunti",
      });
    }
  };

  const activeKey = apiKeys.find(k => k.is_active);
  const trackingEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-analytics`;

  const trackingScript = activeKey ? `<!-- Analytics Tracking Script -->
<script>
(function() {
  var API_KEY = '${activeKey.api_key}';
  var ENDPOINT = '${trackingEndpoint}';
  
  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }
  
  function getBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) return 'IE';
    return 'Other';
  }
  
  function getOS() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Other';
  }
  
  function getVisitorId() {
    var id = localStorage.getItem('_vid');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('_vid', id);
    }
    return id;
  }
  
  function getSessionId() {
    var id = sessionStorage.getItem('_sid');
    if (!id) {
      id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('_sid', id);
    }
    return id;
  }
  
  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign')
    };
  }
  
  function track() {
    var utm = getUTMParams();
    var data = {
      api_key: API_KEY,
      page_url: window.location.pathname,
      page_title: document.title,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      referrer_url: document.referrer || null,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      load_time_ms: window.performance ? Math.round(performance.now()) : null
    };
    
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(function() {});
  }
  
  if (document.readyState === 'complete') {
    track();
  } else {
    window.addEventListener('load', track);
  }
})();
</script>` : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with API Key */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="h-5 w-5" />
              Codice di Tracciamento
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">API Key:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                    {activeKey.api_key.substring(0, 12)}...
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyApiKey}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {activeKey.last_used_at && (
                  <Badge variant="secondary">
                    Ultimo utilizzo: {format(new Date(activeKey.last_used_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowScript(!showScript)}
              >
                {showScript ? 'Nascondi' : 'Mostra'} script da installare
              </Button>
              {showScript && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Copia questo codice prima della chiusura del tag <code>&lt;/body&gt;</code> del tuo sito:
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64">
                      <code>{trackingScript}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(trackingScript);
                        toast({ title: "Script copiato!" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nessuna API key configurata. Contatta l'amministratore.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visite Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.visits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ultimi 30 giorni</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Visitatori Unici
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.unique.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ultimi 30 giorni</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.visits > 0 ? Math.round((totals.mobile / totals.visits) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">{totals.mobile} visite</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.visits > 0 ? Math.round((totals.desktop / totals.visits) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">{totals.desktop} visite</p>
          </CardContent>
        </Card>
      </div>

      {stats.length > 0 ? (
        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits">Andamento Visite</TabsTrigger>
            <TabsTrigger value="sources">Sorgenti Traffico</TabsTrigger>
            <TabsTrigger value="devices">Dispositivi</TabsTrigger>
          </TabsList>

          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Visite negli ultimi 30 giorni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="visite" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="visitatori" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Sorgenti di Traffico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {pieData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{item.value}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            ({totals.visits > 0 ? Math.round((item.value / totals.visits) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle>Breakdown per Dispositivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {deviceData.map((device) => {
                      const Icon = device.icon;
                      const percentage = totals.visits > 0 
                        ? Math.round((device.value / totals.visits) * 100) 
                        : 0;
                      return (
                        <div key={device.name} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                          <Icon className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{device.name}</p>
                            <p className="text-sm text-muted-foreground">{device.value} visite</p>
                          </div>
                          <div className="text-2xl font-bold">{percentage}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground">
              Installa lo script di tracciamento sul tuo sito per iniziare a raccogliere dati.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
