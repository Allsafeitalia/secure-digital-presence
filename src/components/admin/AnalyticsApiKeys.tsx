import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Key, Plus, Copy, Check, Trash2, RefreshCw, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ApiKey {
  id: string;
  client_id: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  client?: {
    name: string;
    ragione_sociale: string | null;
  };
}

interface Client {
  id: string;
  name: string;
  ragione_sociale: string | null;
}

export function AnalyticsApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch API keys with client info
      const { data: keysData, error: keysError } = await supabase
        .from('analytics_api_keys')
        .select(`
          *,
          clients (
            name,
            ragione_sociale
          )
        `)
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;
      
      // Type assertion to handle the joined data
      const typedKeys = (keysData || []).map(key => ({
        ...key,
        client: key.clients as { name: string; ragione_sociale: string | null } | undefined
      }));
      
      setApiKeys(typedKeys);

      // Fetch clients for the dropdown
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, ragione_sociale')
        .eq('is_active', true)
        .order('name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createApiKey = async () => {
    if (!selectedClientId) return;
    
    setCreating(true);
    try {
      const { error } = await supabase
        .from('analytics_api_keys')
        .insert({ client_id: selectedClientId });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "API key creata con successo",
      });
      
      setShowCreateModal(false);
      setSelectedClientId("");
      fetchData();

    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'API key",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('analytics_api_keys')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => 
        prev.map(key => key.id === id ? { ...key, is_active: !isActive } : key)
      );

      toast({
        title: "Aggiornato",
        description: `API key ${!isActive ? 'attivata' : 'disattivata'}`,
      });

    } catch (error) {
      console.error('Error toggling API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa API key? Lo script installato smetterà di funzionare.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('analytics_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== id));

      toast({
        title: "Eliminata",
        description: "API key eliminata con successo",
      });

    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'API key",
        variant: "destructive",
      });
    }
  };

  const copyApiKey = async (apiKey: string, id: string) => {
    await navigator.clipboard.writeText(apiKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copiato!",
      description: "API key copiata negli appunti",
    });
  };

  // Filter clients that don't already have an API key
  const availableClients = clients.filter(
    client => !apiKeys.some(key => key.client_id === client.id)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <CardTitle>API Key Analytics</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova API Key
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna API key creata</p>
            <p className="text-sm">Crea un'API key per iniziare a tracciare le visite dei siti dei clienti</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultimo utilizzo</TableHead>
                <TableHead>Creata</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">
                    {key.client?.ragione_sociale || key.client?.name || 'N/D'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.api_key.substring(0, 12)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyApiKey(key.api_key, key.id)}
                      >
                        {copiedId === key.id ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.is_active}
                        onCheckedChange={() => toggleApiKey(key.id, key.is_active)}
                      />
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Attiva" : "Disattiva"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.last_used_at 
                      ? format(new Date(key.last_used_at), 'dd/MM/yyyy HH:mm', { locale: it })
                      : 'Mai utilizzata'
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(key.created_at), 'dd/MM/yyyy', { locale: it })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuova API Key</DialogTitle>
            <DialogDescription>
              Seleziona il cliente per cui creare una chiave API per il tracking analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {availableClients.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Tutti i clienti hanno già un'API key
                  </SelectItem>
                ) : (
                  availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.ragione_sociale || client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annulla
            </Button>
            <Button 
              onClick={createApiKey} 
              disabled={!selectedClientId || creating}
            >
              {creating ? "Creazione..." : "Crea API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
