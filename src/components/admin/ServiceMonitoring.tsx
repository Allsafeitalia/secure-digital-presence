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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

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

export const ServiceMonitoring = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<MonitoredService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
