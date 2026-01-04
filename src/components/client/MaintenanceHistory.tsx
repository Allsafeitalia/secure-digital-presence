import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wrench,
  Headphones,
  AlertCircle,
  CheckCircle2,
  Clock,
  Euro,
  TrendingUp,
  Calendar,
  FileText,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  priority: string;
  cost: number | null;
  created_at: string;
  completed_at: string | null;
  what_was_done: string | null;
  resolution_notes: string | null;
  service_id: string;
  service_name?: string;
}

interface MaintenanceHistoryProps {
  clientId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: "Aperto", variant: "secondary", icon: Clock },
  in_progress: { label: "In corso", variant: "default", icon: Wrench },
  completed: { label: "Completato", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Annullato", variant: "destructive", icon: AlertCircle },
};

const requestTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  maintenance: { label: "Manutenzione", icon: Wrench, color: "text-blue-600" },
  support: { label: "Assistenza", icon: Headphones, color: "text-purple-600" },
  emergency: { label: "Emergenza", icon: AlertCircle, color: "text-red-600" },
};

export function MaintenanceHistory({ clientId }: MaintenanceHistoryProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceRequests();
  }, [clientId]);

  const fetchMaintenanceRequests = async () => {
    try {
      // Fetch maintenance requests for the client
      const { data: requestsData, error } = await supabase
        .from("maintenance_requests")
        .select(`
          id,
          title,
          description,
          request_type,
          status,
          priority,
          cost,
          created_at,
          completed_at,
          what_was_done,
          resolution_notes,
          service_id
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch service names
      if (requestsData && requestsData.length > 0) {
        const serviceIds = [...new Set(requestsData.map(r => r.service_id))];
        const { data: servicesData } = await supabase
          .from("client_services")
          .select("id, service_name")
          .in("id", serviceIds);

        const serviceMap = new Map(servicesData?.map(s => [s.id, s.service_name]) || []);
        
        const enrichedRequests = requestsData.map(r => ({
          ...r,
          service_name: serviceMap.get(r.service_id) || "Servizio sconosciuto",
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/D";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "€0,00";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  // Calculate stats
  const completedRequests = requests.filter(r => r.status === "completed");
  const totalSpent = completedRequests.reduce((sum, r) => sum + (r.cost || 0), 0);
  const avgCostPerRequest = completedRequests.length > 0 ? totalSpent / completedRequests.length : 0;
  
  // Calculate monthly average (based on last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentRequests = completedRequests.filter(r => new Date(r.created_at) >= oneYearAgo);
  const monthlyAverage = recentRequests.length > 0 
    ? recentRequests.reduce((sum, r) => sum + (r.cost || 0), 0) / 12 
    : 0;

  // Group by request type for analysis
  const byType = requests.reduce((acc, r) => {
    const type = r.request_type || "other";
    if (!acc[type]) {
      acc[type] = { count: 0, totalCost: 0 };
    }
    acc[type].count++;
    if (r.status === "completed" && r.cost) {
      acc[type].totalCost += r.cost;
    }
    return acc;
  }, {} as Record<string, { count: number; totalCost: number }>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10">
          <Wrench className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Storico Manutenzioni e Assistenza</h2>
          <p className="text-sm text-muted-foreground">
            Monitora gli interventi e valuta le spese
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-indigo-500/10">
                <FileText className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-muted-foreground">Totale Interventi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Euro className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
                <p className="text-sm text-muted-foreground">Totale Speso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(monthlyAverage)}</p>
                <p className="text-sm text-muted-foreground">Media Mensile</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(avgCostPerRequest)}</p>
                <p className="text-sm text-muted-foreground">Costo Medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestion Card */}
      {monthlyAverage > 50 && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-indigo-500/10">
                <TrendingUp className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-indigo-900">Considera un Piano di Manutenzione Mensile</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Con una media di <strong>{formatPrice(monthlyAverage)}</strong> al mese in interventi, 
                  potresti risparmiare con un piano di manutenzione programmata. 
                  Contattaci per un preventivo personalizzato!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis by Type */}
      {Object.keys(byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analisi per Tipologia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(byType).map(([type, data]) => {
                const config = requestTypeConfig[type] || { label: type, icon: Wrench, color: "text-gray-600" };
                const TypeIcon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <TypeIcon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} interventi • {formatPrice(data.totalCost)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun intervento di manutenzione o assistenza</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storico Interventi</CardTitle>
            <CardDescription>
              Tutti gli interventi di manutenzione e assistenza
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Servizio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const statusConf = statusConfig[request.status] || statusConfig.open;
                    const typeConf = requestTypeConfig[request.request_type] || requestTypeConfig.maintenance;
                    const StatusIcon = statusConf.icon;
                    const TypeIcon = typeConf.icon;

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="text-sm">
                          {formatDate(request.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            {request.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {request.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.service_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <TypeIcon className={`w-4 h-4 ${typeConf.color}`} />
                            <span className="text-sm">{typeConf.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {request.status === "completed" ? formatPrice(request.cost) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden">
              <Accordion type="single" collapsible className="w-full">
                {requests.map((request) => {
                  const statusConf = statusConfig[request.status] || statusConfig.open;
                  const typeConf = requestTypeConfig[request.request_type] || requestTypeConfig.maintenance;
                  const StatusIcon = statusConf.icon;
                  const TypeIcon = typeConf.icon;

                  return (
                    <AccordionItem value={request.id} key={request.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <TypeIcon className={`w-5 h-5 ${typeConf.color}`} />
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {request.description && (
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Servizio:</span>
                            <span className="text-sm">{request.service_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Stato:</span>
                            <Badge variant={statusConf.variant} className="gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {statusConf.label}
                            </Badge>
                          </div>
                          {request.status === "completed" && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Costo:</span>
                              <span className="font-medium text-green-600">{formatPrice(request.cost)}</span>
                            </div>
                          )}
                          {request.what_was_done && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Lavoro svolto:</p>
                              <p className="text-sm">{request.what_was_done}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
