import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Server,
  Loader2,
  Search,
  Building2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { it } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonitoredService {
  id: string;
  service_name: string;
  service_type: string;
  url_to_monitor: string | null;
  is_online: boolean | null;
  last_check_at: string | null;
  last_response_time_ms: number | null;
  last_error: string | null;
  status: string;
  client: {
    name: string;
    email: string;
  } | null;
}

interface MonitoringLog {
  id: string;
  service_id: string;
  is_online: boolean;
  response_time_ms: number | null;
  checked_at: string;
  status_code: number | null;
  error_message: string | null;
}

interface UptimeStats {
  totalChecks: number;
  onlineChecks: number;
  uptimePercentage: number;
  avgResponseTime: number;
}

export const ServiceMonitoring = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<MonitoredService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<MonitoredService | null>(null);
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [timeRange, setTimeRange] = useState("7");
  const [uptimeStats, setUptimeStats] = useState<UptimeStats | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchMonitoringLogs(selectedService.id);
    }
  }, [selectedService, timeRange]);

  const fetchServices = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("client_services")
      .select(`
        id,
        service_name,
        service_type,
        url_to_monitor,
        is_online,
        last_check_at,
        last_response_time_ms,
        last_error,
        status,
        client:clients(name, email)
      `)
      .eq("status", "active")
      .not("url_to_monitor", "is", null)
      .order("last_check_at", { ascending: false, nullsFirst: true });

    if (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i servizi",
        variant: "destructive",
      });
    } else {
      setServices(data || []);
    }
    setIsLoading(false);
  };

  const fetchMonitoringLogs = async (serviceId: string) => {
    setIsLoadingLogs(true);
    
    const daysAgo = parseInt(timeRange);
    const startDate = subDays(new Date(), daysAgo).toISOString();
    
    const { data, error } = await supabase
      .from("service_monitoring_logs")
      .select("*")
      .eq("service_id", serviceId)
      .gte("checked_at", startDate)
      .order("checked_at", { ascending: true });

    if (error) {
      console.error("Error fetching monitoring logs:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare lo storico",
        variant: "destructive",
      });
    } else {
      setMonitoringLogs(data || []);
      
      // Calculate uptime stats
      if (data && data.length > 0) {
        const totalChecks = data.length;
        const onlineChecks = data.filter(log => log.is_online).length;
        const uptimePercentage = (onlineChecks / totalChecks) * 100;
        const responseTimes = data.filter(log => log.response_time_ms !== null).map(log => log.response_time_ms!);
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0;
        
        setUptimeStats({
          totalChecks,
          onlineChecks,
          uptimePercentage,
          avgResponseTime,
        });
      } else {
        setUptimeStats(null);
      }
    }
    setIsLoadingLogs(false);
  };

  const runMonitoringCheck = async () => {
    setIsRunningCheck(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("monitor-services");
      
      if (error) throw error;

      toast({
        title: "Controllo completato",
        description: `Verificati ${data?.checked || 0} servizi`,
      });
      
      // Refresh the list
      await fetchServices();
    } catch (error: any) {
      console.error("Error running monitoring check:", error);
      toast({
        title: "Errore",
        description: "Impossibile eseguire il controllo",
        variant: "destructive",
      });
    } finally {
      setIsRunningCheck(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const query = searchQuery.toLowerCase();
    return (
      service.service_name.toLowerCase().includes(query) ||
      service.url_to_monitor?.toLowerCase().includes(query) ||
      service.client?.name.toLowerCase().includes(query)
    );
  });

  const onlineCount = services.filter((s) => s.is_online === true).length;
  const offlineCount = services.filter((s) => s.is_online === false).length;
  const uncheckedCount = services.filter((s) => s.is_online === null).length;

  // Prepare chart data
  const chartData = monitoringLogs.map(log => ({
    time: format(new Date(log.checked_at), "dd/MM HH:mm"),
    responseTime: log.response_time_ms || 0,
    status: log.is_online ? 1 : 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Monitoraggio Servizi</h2>
            <p className="text-sm text-muted-foreground">
              {services.length} servizi monitorati
            </p>
          </div>
        </div>
        <Button 
          onClick={runMonitoringCheck} 
          disabled={isRunningCheck}
        >
          {isRunningCheck ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRunningCheck ? "Controllo in corso..." : "Esegui Controllo"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-2xl">{onlineCount}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Online</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="w-5 h-5" />
            <span className="font-bold text-2xl">{offlineCount}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Offline</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-2xl">{uncheckedCount}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Non verificati</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nome servizio, URL o cliente..."
          className="pl-10"
        />
      </div>

      {/* Services Table */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nessun servizio con URL da monitorare</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stato</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Risposta</TableHead>
                <TableHead>Ultimo Check</TableHead>
                <TableHead>Storico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    {service.is_online === null ? (
                      <Badge variant="outline" className="bg-muted">
                        <Clock className="w-3 h-3 mr-1" />
                        N/A
                      </Badge>
                    ) : service.is_online ? (
                      <Badge className="bg-green-500/10 text-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500">
                        <XCircle className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{service.service_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{service.client?.name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={service.url_to_monitor?.startsWith("http") ? service.url_to_monitor : `https://${service.url_to_monitor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {service.url_to_monitor}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.last_response_time_ms ? (
                      <span className={service.last_response_time_ms > 2000 ? "text-yellow-500" : "text-green-500"}>
                        {service.last_response_time_ms}ms
                      </span>
                    ) : (
                      "-"
                    )}
                    {service.last_error && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        {service.last_error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.last_check_at ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(service.last_check_at), { addSuffix: true, locale: it })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedService(service)}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Monitoring History Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Storico Monitoraggio - {selectedService?.service_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedService?.url_to_monitor}
              </p>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ultime 24 ore</SelectItem>
                  <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                  <SelectItem value="30">Ultimi 30 giorni</SelectItem>
                  <SelectItem value="90">Ultimi 90 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : monitoringLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nessun dato di monitoraggio disponibile</p>
              </div>
            ) : (
              <>
                {/* Uptime Stats */}
                {uptimeStats && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className={`text-2xl font-bold ${
                        uptimeStats.uptimePercentage >= 99 ? "text-green-500" :
                        uptimeStats.uptimePercentage >= 95 ? "text-yellow-500" : "text-red-500"
                      }`}>
                        {uptimeStats.uptimePercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Controlli totali</p>
                      <p className="text-2xl font-bold">{uptimeStats.totalChecks}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Online</p>
                      <p className="text-2xl font-bold text-green-500">{uptimeStats.onlineChecks}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Tempo medio</p>
                      <p className="text-2xl font-bold">{Math.round(uptimeStats.avgResponseTime)}ms</p>
                    </div>
                  </div>
                )}

                {/* Response Time Chart */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-medium mb-4">Tempo di Risposta (ms)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="responseTime"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#responseGradient)"
                          name="Tempo (ms)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-medium mb-4">Stato nel Tempo</h3>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {monitoringLogs.slice(-100).map((log, index) => (
                      <div
                        key={log.id}
                        className={`w-3 h-8 rounded-sm flex-shrink-0 ${
                          log.is_online ? "bg-green-500" : "bg-red-500"
                        }`}
                        title={`${format(new Date(log.checked_at), "dd/MM/yyyy HH:mm")} - ${log.is_online ? "Online" : "Offline"}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Più vecchio</span>
                    <span>Più recente</span>
                  </div>
                </div>

                {/* Recent Logs Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <h3 className="font-medium p-4 border-b border-border">Ultimi Controlli</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Ora</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Tempo Risposta</TableHead>
                        <TableHead>Codice HTTP</TableHead>
                        <TableHead>Errore</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoringLogs.slice(-20).reverse().map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.checked_at), "dd/MM/yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            {log.is_online ? (
                              <Badge className="bg-green-500/10 text-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-500">
                                <XCircle className="w-3 h-3 mr-1" />
                                Offline
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.response_time_ms ? `${log.response_time_ms}ms` : "-"}
                          </TableCell>
                          <TableCell>
                            {log.status_code || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-red-500 text-sm">
                            {log.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
