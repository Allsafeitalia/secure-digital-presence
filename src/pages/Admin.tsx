import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Ticket,
  CheckCircle,
  Clock,
  Mail,
  User,
  Calendar,
  X,
  RefreshCw,
  Phone,
  MessageCircle,
  Building2,
  Users,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CreateClientModal } from "@/components/admin/CreateClientModal";
import { ClientDetails } from "@/components/admin/ClientDetails";

interface ContactTicket {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  ticket_id?: string | null;
  name: string;
  email: string;
  phone: string | null;
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_sdi: string | null;
  pec: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  is_active?: boolean;
}

type ViewMode = "tickets" | "clients";

const Admin = () => {
  const [tickets, setTickets] = useState<ContactTicket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ContactTicket | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("tickets");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminRole = async (userId: string) => {
      const { data } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });
      return data === true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setTimeout(async () => {
            const isAdmin = await checkAdminRole(session.user.id);
            if (!isAdmin) {
              toast({
                title: "Accesso negato",
                description: "Non hai i permessi di amministratore",
                variant: "destructive",
              });
              await supabase.auth.signOut();
              navigate("/auth");
            }
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        const isAdmin = await checkAdminRole(session.user.id);
        if (!isAdmin) {
          toast({
            title: "Accesso negato",
            description: "Non hai i permessi di amministratore",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          navigate("/auth");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  useEffect(() => {
    fetchTickets();
    fetchClients();

    const ticketChannel = supabase
      .channel("tickets-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    const clientChannel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(clientChannel);
    };
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contact_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i ticket",
        variant: "destructive",
      });
    } else {
      setTickets((data as ContactTicket[]) || []);
    }
    setIsLoading(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients((data as Client[]) || []);
    }
  };

  const toggleTicketStatus = async (ticket: ContactTicket) => {
    const newStatus = ticket.status === "open" ? "closed" : "open";
    const { error } = await supabase
      .from("contact_tickets")
      .update({ status: newStatus })
      .eq("id", ticket.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Stato aggiornato",
        description: `Ticket ${newStatus === "open" ? "riaperto" : "chiuso"}`,
      });
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...ticket, status: newStatus });
      }
    }
  };

  const deleteTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from("contact_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il ticket",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ticket eliminato",
        description: "Il ticket è stato rimosso",
      });
      setSelectedTicket(null);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo cliente e tutti i suoi servizi?")) return;
    
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il cliente",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato rimosso",
      });
      setSelectedClient(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isAlreadyClient = (ticketId: string) => {
    return clients.some((c) => c.ticket_id === ticketId);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "all") return true;
    return ticket.status === filter;
  });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              {viewMode === "tickets" ? (
                <Ticket className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              ) : (
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm md:text-lg truncate">
                {viewMode === "tickets" ? "Ticket" : "Clienti"}
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm hidden md:block">
                {viewMode === "tickets"
                  ? "Gestisci le richieste di contatto"
                  : `${clients.length} clienti registrati`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-3">
            <div className="flex bg-secondary/50 rounded-lg p-0.5 md:p-1">
              <button
                onClick={() => {
                  setViewMode("tickets");
                  setSelectedClient(null);
                  setSelectedTicket(null);
                }}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                  viewMode === "tickets"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                }`}
              >
                <Ticket className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block md:mr-2" />
                <span className="hidden md:inline">Ticket</span>
              </button>
              <button
                onClick={() => {
                  setViewMode("clients");
                  setSelectedTicket(null);
                  setSelectedClient(null);
                }}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                  viewMode === "clients"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                }`}
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 inline-block md:mr-2" />
                <span className="hidden md:inline">Clienti</span>
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="hidden md:flex"
            >
              Torna al sito
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive p-2"
            >
              <LogOut size={16} className="md:w-[18px] md:h-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row h-[calc(100vh-57px)] md:h-[calc(100vh-73px)]">
        {/* Sidebar - Hidden on mobile when item selected */}
        <aside className={`${(selectedTicket || selectedClient) ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-card md:border-r border-border flex-col h-full md:h-auto`}>
          {viewMode === "tickets" ? (
            <>
              {/* Stats */}
              <div className="p-4 border-b border-border">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`p-3 rounded-xl text-center transition-colors ${
                      filter === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="text-xl font-bold">{tickets.length}</div>
                    <div className="text-xs opacity-80">Tutti</div>
                  </button>
                  <button
                    onClick={() => setFilter("open")}
                    className={`p-3 rounded-xl text-center transition-colors ${
                      filter === "open"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="text-xl font-bold">{openCount}</div>
                    <div className="text-xs opacity-80">Aperti</div>
                  </button>
                  <button
                    onClick={() => setFilter("closed")}
                    className={`p-3 rounded-xl text-center transition-colors ${
                      filter === "closed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="text-xl font-bold">{closedCount}</div>
                    <div className="text-xs opacity-80">Chiusi</div>
                  </button>
                </div>
              </div>

              {/* Refresh */}
              <div className="p-4 border-b border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={fetchTickets}
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  Aggiorna
                </Button>
              </div>

              {/* Ticket List */}
              <div className="flex-1 overflow-y-auto">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nessun ticket trovato</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full p-4 text-left hover:bg-secondary/50 transition-colors ${
                          selectedTicket?.id === ticket.id ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium truncate">{ticket.name}</span>
                          <div className="flex gap-1">
                            {isAlreadyClient(ticket.id) && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                Cliente
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                ticket.status === "open"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {ticket.status === "open" ? "Aperto" : "Chiuso"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm", {
                            locale: it,
                          })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Clients Stats */}
              <div className="p-4 border-b border-border">
                <div className="bg-primary/10 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-primary">{clients.length}</div>
                  <div className="text-sm text-muted-foreground">Clienti Totali</div>
                </div>
              </div>

              {/* Refresh */}
              <div className="p-4 border-b border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={fetchClients}
                >
                  <RefreshCw size={16} />
                  Aggiorna
                </Button>
              </div>

              {/* Client List */}
              <div className="flex-1 overflow-y-auto">
                {clients.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nessun cliente registrato</p>
                    <p className="text-sm mt-2">
                      Usa "Diventa Cliente" su un ticket per aggiungere clienti
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full p-4 text-left hover:bg-secondary/50 transition-colors ${
                          selectedClient?.id === client.id ? "bg-secondary" : ""
                        } ${client.is_active === false ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <Building2 className={`w-4 h-4 ${client.is_active === false ? "text-muted-foreground" : "text-primary"}`} />
                          <span className="font-medium truncate flex-1">{client.name}</span>
                          {client.is_active === false && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                              OFF
                            </span>
                          )}
                        </div>
                        {client.ragione_sociale && (
                          <p className="text-sm text-muted-foreground truncate mb-1 ml-7">
                            {client.ragione_sociale}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground ml-7">
                          {client.email}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Main Content - Hidden on mobile when no item selected */}
        <main className={`${(selectedTicket || selectedClient) ? 'flex' : 'hidden md:flex'} flex-1 overflow-y-auto flex-col`}>
          {viewMode === "tickets" && selectedTicket ? (
            <div className="p-4 md:p-8 max-w-3xl w-full">
              {/* Mobile Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="mb-4 md:hidden"
              >
                <X className="w-4 h-4 mr-2" />
                Indietro
              </Button>

              {/* Ticket Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <h2 className="font-display text-xl md:text-2xl font-bold">
                      {selectedTicket.subject}
                    </h2>
                    <span
                      className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                        selectedTicket.status === "open"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedTicket.status === "open" ? "Aperto" : "Chiuso"}
                    </span>
                    {isAlreadyClient(selectedTicket.id) && (
                      <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-blue-500/10 text-blue-500">
                        Già Cliente
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm">
                    ID: {selectedTicket.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isAlreadyClient(selectedTicket.id) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowCreateClient(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm"
                    >
                      <UserPlus size={14} className="md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Diventa</span> Cliente
                    </Button>
                  )}
                  <Button
                    variant={selectedTicket.status === "open" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTicketStatus(selectedTicket)}
                    className="text-xs md:text-sm"
                  >
                    {selectedTicket.status === "open" ? (
                      <>
                        <CheckCircle size={14} className="md:w-4 md:h-4" />
                        Chiudi
                      </>
                    ) : (
                      <>
                        <Clock size={14} className="md:w-4 md:h-4" />
                        Riapri
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTicket(selectedTicket.id)}
                    className="text-xs md:text-sm"
                  >
                    <X size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Elimina</span>
                  </Button>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                    <User size={14} className="md:w-4 md:h-4" />
                    Nome
                  </div>
                  <p className="font-medium text-sm md:text-base truncate">{selectedTicket.name}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                    <Mail size={14} className="md:w-4 md:h-4" />
                    Email
                  </div>
                  <a
                    href={`mailto:${selectedTicket.email}`}
                    className="font-medium text-primary hover:underline text-sm md:text-base block truncate"
                  >
                    {selectedTicket.email}
                  </a>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                    <Calendar size={14} className="md:w-4 md:h-4" />
                    Ricevuto
                  </div>
                  <p className="font-medium text-sm md:text-base">
                    {format(new Date(selectedTicket.created_at), "dd MMM yyyy", {
                      locale: it,
                    })}
                  </p>
                </div>
                {selectedTicket.phone && (
                  <div className="bg-secondary/30 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                      <Phone size={14} className="md:w-4 md:h-4" />
                      WhatsApp
                    </div>
                    <a
                      href={`https://wa.me/${selectedTicket.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-500 hover:underline text-sm md:text-base"
                    >
                      {selectedTicket.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6">
                <h3 className="font-medium mb-3 md:mb-4 text-sm md:text-base">Messaggio</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {selectedTicket.message}
                </p>
              </div>

              <div className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-2 md:gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(`mailto:${selectedTicket.email}`, "_blank")
                  }
                  className="text-sm md:text-base"
                >
                  <Mail size={16} className="md:w-[18px] md:h-[18px]" />
                  Rispondi via Email
                </Button>
                {selectedTicket.phone && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${selectedTicket.phone!.replace(/\D/g, "")}`,
                        "_blank"
                      )
                    }
                    className="text-green-600 border-green-600 hover:bg-green-600/10 text-sm md:text-base"
                  >
                    <MessageCircle size={16} className="md:w-[18px] md:h-[18px]" />
                    Rispondi via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === "clients" && selectedClient ? (
            <ClientDetails
              client={selectedClient}
              onBack={() => setSelectedClient(null)}
              onClientUpdate={(updatedClient) => {
                setSelectedClient(updatedClient);
                setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                {viewMode === "tickets" ? (
                  <>
                    <Ticket className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Seleziona un ticket per visualizzarlo</p>
                  </>
                ) : (
                  <>
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Seleziona un cliente per visualizzarlo</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Client Modal */}
      {selectedTicket && (
        <CreateClientModal
          open={showCreateClient}
          onOpenChange={setShowCreateClient}
          ticketData={{
            id: selectedTicket.id,
            name: selectedTicket.name,
            email: selectedTicket.email,
            phone: selectedTicket.phone,
          }}
          onSuccess={() => {
            fetchClients();
            setShowCreateClient(false);
          }}
        />
      )}
    </div>
  );
};

export default Admin;
