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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ContactTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const [tickets, setTickets] = useState<ContactTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ContactTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    fetchTickets();

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Pannello Ticket</h1>
              <p className="text-muted-foreground text-sm">
                Gestisci le richieste di contatto
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
            >
              Torna al sito
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-80 bg-card border-r border-border flex flex-col">
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {selectedTicket ? (
            <div className="p-8 max-w-3xl">
              {/* Ticket Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-display text-2xl font-bold">
                      {selectedTicket.subject}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTicket.status === "open"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedTicket.status === "open" ? "Aperto" : "Chiuso"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    ID: {selectedTicket.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedTicket.status === "open" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTicketStatus(selectedTicket)}
                  >
                    {selectedTicket.status === "open" ? (
                      <>
                        <CheckCircle size={16} />
                        Chiudi
                      </>
                    ) : (
                      <>
                        <Clock size={16} />
                        Riapri
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTicket(selectedTicket.id)}
                  >
                    <X size={16} />
                    Elimina
                  </Button>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <User size={16} />
                    Nome
                  </div>
                  <p className="font-medium">{selectedTicket.name}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Mail size={16} />
                    Email
                  </div>
                  <a
                    href={`mailto:${selectedTicket.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selectedTicket.email}
                  </a>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar size={16} />
                    Ricevuto
                  </div>
                  <p className="font-medium">
                    {format(new Date(selectedTicket.created_at), "dd MMMM yyyy, HH:mm", {
                      locale: it,
                    })}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-medium mb-4">Messaggio</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(`mailto:${selectedTicket.email}`, "_blank")
                  }
                >
                  <Mail size={18} />
                  Rispondi via Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${selectedTicket.email.includes("@") ? "" : selectedTicket.email}`,
                      "_blank"
                    )
                  }
                  className="text-green-600 border-green-600 hover:bg-green-600/10"
                >
                  Rispondi via WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Ticket className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Seleziona un ticket per visualizzarlo</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Admin;
