import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Server,
  RefreshCw,
  Edit,
  FileText,
  Euro,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface MaintenanceRequest {
  id: string;
  service_id: string;
  client_id: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  completed_at: string | null;
  resolution_notes: string | null;
  what_was_done: string | null;
  assigned_to: string | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
  service?: {
    service_name: string;
    service_type: string;
  };
  client?: {
    name: string;
    email: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  open: { label: "Aperto", color: "bg-blue-500/10 text-blue-500", icon: AlertCircle },
  in_progress: { label: "In Corso", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  scheduled: { label: "Programmato", color: "bg-purple-500/10 text-purple-500", icon: Calendar },
  closed: { label: "Chiuso", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  resolved: { label: "Risolto", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  not_resolved: { label: "Non Risolto", color: "bg-red-500/10 text-red-500", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Bassa", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normale", color: "bg-blue-500/10 text-blue-500" },
  high: { label: "Alta", color: "bg-orange-500/10 text-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-500" },
};

const requestTypeConfig: Record<string, string> = {
  maintenance: "Manutenzione",
  support: "Assistenza",
  update: "Aggiornamento",
  bug_fix: "Bug Fix",
};

export const MaintenanceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; service_name: string; client_id: string }[]>([]);
  
  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    title: "",
    description: "",
    request_type: "maintenance",
    status: "open",
    priority: "normal",
    scheduled_date: "",
    assigned_to: "",
    resolution_notes: "",
    what_was_done: "",
    cost: "",
  });

  useEffect(() => {
    fetchRequests();
    fetchClients();
    fetchServices();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        service:client_services(service_name, service_type),
        client:clients(name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching maintenance requests:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le richieste di manutenzione",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setClients(data || []);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from("client_services")
      .select("id, service_name, client_id")
      .eq("status", "active")
      .order("service_name");
    setServices(data || []);
  };

  const handleCreate = async () => {
    if (!formData.client_id || !formData.service_id || !formData.title) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("maintenance_requests").insert({
      client_id: formData.client_id,
      service_id: formData.service_id,
      title: formData.title,
      description: formData.description || null,
      request_type: formData.request_type,
      status: formData.status,
      priority: formData.priority,
      scheduled_date: formData.scheduled_date || null,
      assigned_to: formData.assigned_to || null,
    });

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare la richiesta",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Richiesta creata",
        description: "La richiesta di manutenzione è stata creata",
      });
      setShowCreateModal(false);
      resetForm();
      fetchRequests();
    }
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;

    const updateData: Record<string, any> = {
      title: formData.title,
      description: formData.description || null,
      request_type: formData.request_type,
      status: formData.status,
      priority: formData.priority,
      scheduled_date: formData.scheduled_date || null,
      assigned_to: formData.assigned_to || null,
      resolution_notes: formData.resolution_notes || null,
      what_was_done: formData.what_was_done || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    };

    // Se lo stato diventa resolved, closed o not_resolved, imposta completed_at
    if (["resolved", "closed", "not_resolved"].includes(formData.status) && 
        !["resolved", "closed", "not_resolved"].includes(selectedRequest.status)) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", selectedRequest.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la richiesta",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Richiesta aggiornata",
        description: "La richiesta è stata aggiornata con successo",
      });
      setShowEditModal(false);
      setSelectedRequest(null);
      resetForm();
      fetchRequests();
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      service_id: "",
      title: "",
      description: "",
      request_type: "maintenance",
      status: "open",
      priority: "normal",
      scheduled_date: "",
      assigned_to: "",
      resolution_notes: "",
      what_was_done: "",
      cost: "",
    });
  };

  const openEditModal = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setFormData({
      client_id: request.client_id,
      service_id: request.service_id,
      title: request.title,
      description: request.description || "",
      request_type: request.request_type,
      status: request.status,
      priority: request.priority,
      scheduled_date: request.scheduled_date ? request.scheduled_date.split("T")[0] : "",
      assigned_to: request.assigned_to || "",
      resolution_notes: request.resolution_notes || "",
      what_was_done: request.what_was_done || "",
      cost: request.cost !== null ? request.cost.toString() : "",
    });
    setShowEditModal(true);
  };

  const filteredServices = formData.client_id
    ? services.filter((s) => s.client_id === formData.client_id)
    : services;

  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

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
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Manutenzione & Assistenza</h2>
            <p className="text-sm text-muted-foreground">
              {requests.length} richieste totali
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Nuova Richiesta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Tutti ({requests.length})
        </Button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = requests.filter((r) => r.status === status).length;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nessuna richiesta trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const statusInfo = statusConfig[request.status] || statusConfig.open;
            const priorityInfo = priorityConfig[request.priority] || priorityConfig.normal;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={request.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-medium">{request.title}</h3>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      <Badge className={priorityInfo.color}>
                        {priorityInfo.label}
                      </Badge>
                      <Badge variant="outline">
                        {requestTypeConfig[request.request_type] || request.request_type}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                      {request.client && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {request.client.name}
                        </div>
                      )}
                      {request.service && (
                        <div className="flex items-center gap-1">
                          <Server className="w-4 h-4" />
                          {request.service.service_name}
                        </div>
                      )}
                      {request.scheduled_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(request.scheduled_date), "dd/MM/yyyy HH:mm", { locale: it })}
                        </div>
                      )}
                      {request.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {request.assigned_to}
                        </div>
                      )}
                    </div>

                    {request.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {request.description}
                      </p>
                    )}

                    {(request.resolution_notes || request.what_was_done || request.cost !== null) && (
                      <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-sm">
                        {request.what_was_done && (
                          <div className="mb-2">
                            <span className="font-medium">Intervento eseguito: </span>
                            {request.what_was_done}
                          </div>
                        )}
                        {request.resolution_notes && (
                          <div className="mb-2">
                            <span className="font-medium">Note risoluzione: </span>
                            {request.resolution_notes}
                          </div>
                        )}
                        {request.cost !== null && (
                          <div className="flex items-center gap-1">
                            <Euro className="w-4 h-4 text-primary" />
                            <span className="font-medium">Costo intervento: </span>
                            <span className="text-primary font-bold">€{request.cost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Creato: {format(new Date(request.created_at), "dd/MM/yyyy", { locale: it })}</span>
                      {request.completed_at && (
                        <span>Completato: {format(new Date(request.completed_at), "dd/MM/yyyy", { locale: it })}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(request)}
                  >
                    <Edit className="w-4 h-4" />
                    Modifica
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuova Richiesta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value, service_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Servizio *</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                disabled={!formData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona servizio" />
                </SelectTrigger>
                <SelectContent>
                  {filteredServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titolo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Descrizione breve dell'intervento"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Dettagli aggiuntivi..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(requestTypeConfig).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorità</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Intervento</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assegnato a</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="Nome tecnico"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreate}>
              Crea Richiesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Modifica Richiesta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titolo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(requestTypeConfig).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorità</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stato</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Intervento</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assegnato a</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="Nome tecnico"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cosa è stato fatto</Label>
              <Textarea
                value={formData.what_was_done}
                onChange={(e) => setFormData({ ...formData, what_was_done: e.target.value })}
                placeholder="Descrivi l'intervento eseguito..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Note risoluzione</Label>
              <Textarea
                value={formData.resolution_notes}
                onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                placeholder="Note aggiuntive sulla risoluzione..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Costo Intervento (€)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleUpdate}>
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
