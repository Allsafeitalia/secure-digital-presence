import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  User,
  Package,
  MessageSquare,
  Calendar,
  Power,
  PowerOff,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CancellationRequest {
  id: string;
  service_id: string;
  client_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

interface ServiceInfo {
  id: string;
  service_name: string;
  service_type: string;
  status: string;
  expiration_date: string | null;
  auto_renew: boolean;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  ragione_sociale: string | null;
}

interface CancellationWithDetails extends CancellationRequest {
  service?: ServiceInfo;
  client?: ClientInfo;
}

const statusConfig = {
  pending: { label: "In attesa", variant: "secondary" as const, icon: Clock },
  approved: { label: "Approvata", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rifiutata", variant: "destructive" as const, icon: XCircle },
};

export const CancellationRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CancellationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  
  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<CancellationWithDetails | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("cancellation-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_cancellation_requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      // Fetch all cancellation requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("service_cancellation_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch related services and clients
      const serviceIds = [...new Set(requestsData?.map(r => r.service_id) || [])];
      const clientIds = [...new Set(requestsData?.map(r => r.client_id) || [])];

      const [servicesResult, clientsResult] = await Promise.all([
        supabase
          .from("client_services")
          .select("id, service_name, service_type, status, expiration_date, auto_renew")
          .in("id", serviceIds),
        supabase
          .from("clients")
          .select("id, name, email, ragione_sociale")
          .in("id", clientIds),
      ]);

      const servicesMap = new Map(
        (servicesResult.data || []).map(s => [s.id, s as ServiceInfo])
      );
      const clientsMap = new Map(
        (clientsResult.data || []).map(c => [c.id, c as ClientInfo])
      );

      const enrichedRequests: CancellationWithDetails[] = (requestsData || []).map(r => ({
        ...r,
        status: r.status as "pending" | "approved" | "rejected",
        service: servicesMap.get(r.service_id),
        client: clientsMap.get(r.client_id),
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error("Error fetching cancellation requests:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le richieste",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openProcessModal = (request: CancellationWithDetails, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setProcessAction(action);
    setAdminNotes("");
    setShowProcessModal(true);
  };

  const handleProcess = async () => {
    if (!selectedRequest || !processAction) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update the cancellation request
      const { error: updateError } = await supabase
        .from("service_cancellation_requests")
        .update({
          status: processAction === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes.trim() || null,
          processed_at: new Date().toISOString(),
          processed_by: user?.id || null,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // If approved, disable auto_renew and optionally change service status
      if (processAction === "approve" && selectedRequest.service) {
        const { error: serviceError } = await supabase
          .from("client_services")
          .update({
            auto_renew: false,
            // Optionally set status to "cancelled" if you want immediate deactivation
            // status: "cancelled"
          })
          .eq("id", selectedRequest.service_id);

        if (serviceError) {
          console.error("Error updating service:", serviceError);
        }
      }

      toast({
        title: processAction === "approve" ? "Richiesta approvata" : "Richiesta rifiutata",
        description: processAction === "approve"
          ? "Il servizio non verrà rinnovato alla scadenza"
          : "La richiesta è stata rifiutata",
      });

      setShowProcessModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error processing request:", error);
      toast({
        title: "Errore",
        description: "Impossibile elaborare la richiesta",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleServiceAction = async (serviceId: string, action: "activate" | "suspend" | "cancel") => {
    try {
      const statusMap: Record<string, "active" | "suspended" | "cancelled"> = {
        activate: "active",
        suspend: "suspended",
        cancel: "cancelled",
      };

      const { error } = await supabase
        .from("client_services")
        .update({
          status: statusMap[action],
          auto_renew: action === "activate" ? true : false,
        })
        .eq("id", serviceId);

      if (error) throw error;

      toast({
        title: "Servizio aggiornato",
        description: action === "activate"
          ? "Il servizio è stato riattivato"
          : action === "suspend"
            ? "Il servizio è stato sospeso"
            : "Il servizio è stato cancellato",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il servizio",
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Richieste di Disattivazione</h2>
          <p className="text-muted-foreground text-sm">
            Gestisci le richieste di cancellazione servizi dai clienti
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 hover:bg-secondary"
          }`}
        >
          <div className="text-xl font-bold">{requests.length}</div>
          <div className="text-xs opacity-80">Tutte</div>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === "pending"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 hover:bg-secondary"
          }`}
        >
          <div className="text-xl font-bold">{pendingCount}</div>
          <div className="text-xs opacity-80">In attesa</div>
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === "approved"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 hover:bg-secondary"
          }`}
        >
          <div className="text-xl font-bold">{approvedCount}</div>
          <div className="text-xs opacity-80">Approvate</div>
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === "rejected"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 hover:bg-secondary"
          }`}
        >
          <div className="text-xl font-bold">{rejectedCount}</div>
          <div className="text-xs opacity-80">Rifiutate</div>
        </button>
      </div>

      {/* Requests list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p>Caricamento richieste...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessuna richiesta trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const StatusIcon = statusConfig[request.status].icon;

            return (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {request.service?.service_name || "Servizio non trovato"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" />
                        {request.client?.ragione_sociale || request.client?.name || "Cliente sconosciuto"}
                        <span className="text-muted-foreground">
                          ({request.client?.email})
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={statusConfig[request.status].variant}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[request.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Request reason */}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MessageSquare className="w-3 h-3" />
                      Motivazione del cliente
                    </div>
                    <p className="text-sm">{request.reason}</p>
                  </div>

                  {/* Service info */}
                  {request.service && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">
                        {request.service.service_type}
                      </Badge>
                      <Badge variant={request.service.status === "active" ? "default" : "secondary"}>
                        {request.service.status}
                      </Badge>
                      {request.service.expiration_date && (
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          Scade: {format(new Date(request.service.expiration_date), "dd/MM/yyyy")}
                        </Badge>
                      )}
                      <Badge variant={request.service.auto_renew ? "default" : "secondary"}>
                        {request.service.auto_renew ? "Rinnovo auto" : "No rinnovo auto"}
                      </Badge>
                    </div>
                  )}

                  {/* Admin notes if processed */}
                  {request.admin_notes && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Note admin</div>
                      <p className="text-sm">{request.admin_notes}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Richiesta: {format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                    </span>
                    {request.processed_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Elaborata: {format(new Date(request.processed_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {request.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openProcessModal(request, "approve")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openProcessModal(request, "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rifiuta
                        </Button>
                      </>
                    )}
                    
                    {/* Service management buttons */}
                    {request.service && (
                      <>
                        {request.service.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleServiceAction(request.service_id, "suspend")}
                            >
                              <PowerOff className="w-4 h-4 mr-1" />
                              Sospendi Servizio
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 border-red-200"
                              onClick={() => handleServiceAction(request.service_id, "cancel")}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancella Servizio
                            </Button>
                          </>
                        )}
                        {(request.service.status === "suspended" || request.service.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 border-green-200"
                            onClick={() => handleServiceAction(request.service_id, "activate")}
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Riattiva Servizio
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Process Modal */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={processAction === "approve" ? "text-green-600" : "text-red-600"}>
              {processAction === "approve" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Approva Disattivazione
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Rifiuta Disattivazione
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {processAction === "approve" ? (
                <>
                  Il servizio <strong>{selectedRequest?.service?.service_name}</strong> non verrà rinnovato alla scadenza.
                  Il rinnovo automatico verrà disabilitato.
                </>
              ) : (
                <>
                  La richiesta di disattivazione per <strong>{selectedRequest?.service?.service_name}</strong> verrà rifiutata.
                  Il servizio rimarrà attivo.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">Motivazione del cliente</div>
              <p className="text-sm">{selectedRequest?.reason}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Note (opzionale)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Aggiungi eventuali note sulla decisione..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessModal(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className={processAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={processAction === "reject" ? "destructive" : "default"}
            >
              {isProcessing ? "Elaborazione..." : processAction === "approve" ? "Conferma Approvazione" : "Conferma Rifiuto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
