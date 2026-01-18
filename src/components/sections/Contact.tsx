import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, CheckCircle, MessageCircle, User, Search, X, Shield } from "lucide-react";
import { maskEmail } from "@/lib/maskEmail";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Validation schema for new clients (full form)
const newClientSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Il nome è obbligatorio")
    .max(100, "Il nome non può superare 100 caratteri"),
  email: z.string()
    .trim()
    .email("Inserisci un indirizzo email valido")
    .max(255, "L'email non può superare 255 caratteri"),
  phone: z.string()
    .max(20, "Il numero di telefono non può superare 20 caratteri")
    .regex(/^[\d\s]*$/, "Il numero può contenere solo cifre")
    .optional()
    .or(z.literal("")),
  subject: z.string()
    .trim()
    .min(1, "L'oggetto è obbligatorio")
    .max(200, "L'oggetto non può superare 200 caratteri"),
  message: z.string()
    .trim()
    .min(1, "Il messaggio è obbligatorio")
    .max(5000, "Il messaggio non può superare 5000 caratteri"),
});

// Validation schema for recognized clients (minimal form)
const recognizedClientSchema = z.object({
  subject: z.string()
    .trim()
    .min(1, "L'oggetto è obbligatorio")
    .max(200, "L'oggetto non può superare 200 caratteri"),
  message: z.string()
    .trim()
    .min(1, "Il messaggio è obbligatorio")
    .max(5000, "Il messaggio non può superare 5000 caratteri"),
});

const countryCodes = [
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "Regno Unito", flag: "🇬🇧" },
  { code: "+49", country: "Germania", flag: "🇩🇪" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+34", country: "Spagna", flag: "🇪🇸" },
  { code: "+41", country: "Svizzera", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+32", country: "Belgio", flag: "🇧🇪" },
  { code: "+31", country: "Paesi Bassi", flag: "🇳🇱" },
  { code: "+351", country: "Portogallo", flag: "🇵🇹" },
  { code: "+48", country: "Polonia", flag: "🇵🇱" },
  { code: "+30", country: "Grecia", flag: "🇬🇷" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+385", country: "Croazia", flag: "🇭🇷" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+420", country: "Rep. Ceca", flag: "🇨🇿" },
];

interface RecognizedClient {
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  code: string;
}

type ClientVerificationStep = "lookup" | "otp-sent" | "verified";

export const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countryCode, setCountryCode] = useState("+39");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    honeypot: "",
  });

  // Client recognition state
  const [clientMode, setClientMode] = useState<"new" | "existing">("new");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupType, setLookupType] = useState<"code" | "email" | "phone">("code");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [recognizedClient, setRecognizedClient] = useState<RecognizedClient | null>(null);
  const [clientVerificationStep, setClientVerificationStep] = useState<ClientVerificationStep>("lookup");
  const [pendingClient, setPendingClient] = useState<RecognizedClient | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Start countdown when OTP is sent
  useEffect(() => {
    if (clientVerificationStep === "otp-sent") {
      setResendCountdown(60);
    }
  }, [clientVerificationStep]);

  const handleResendOtp = async () => {
    if (!pendingClient || resendCountdown > 0) return;
    
    setIsResending(true);
    
    try {
      const response = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: pendingClient.client_email,
          purpose: 'contact_verification',
          clientName: pendingClient.client_name,
        },
      });

      if (response.error) {
        throw new Error("Impossibile reinviare il codice");
      }

      setResendCountdown(60);
      toast({
        title: "Codice reinviato!",
        description: `Nuovo codice inviato a ${maskEmail(pendingClient.client_email)}`,
      });
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile reinviare il codice",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLookupClient = async () => {
    if (!lookupValue.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un valore per la ricerca",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUp(true);

    try {
      const params: { p_client_code?: string; p_email?: string; p_phone?: string } = {};
      
      if (lookupType === "code") {
        params.p_client_code = lookupValue.trim();
      } else if (lookupType === "email") {
        params.p_email = lookupValue.trim();
      } else {
        params.p_phone = lookupValue.trim();
      }

      const { data, error } = await supabase.rpc('lookup_client_for_ticket', params);

      if (error) throw error;

      if (data && data.length > 0) {
        const client = data[0] as RecognizedClient;
        setPendingClient(client);
        
        // Send OTP to client email via custom edge function
        const response = await supabase.functions.invoke('send-verification-code', {
          body: {
            email: client.client_email,
            purpose: 'contact_verification',
            clientName: client.client_name,
          },
        });

        if (response.error) {
          console.error("OTP error:", response.error);
          throw new Error("Impossibile inviare il codice di verifica");
        }

        setClientVerificationStep("otp-sent");
        toast({
          title: "Codice inviato!",
          description: `Abbiamo inviato un codice di verifica a ${maskEmail(client.client_email)}`,
        });
      } else {
        toast({
          title: "Cliente non trovato",
          description: "Nessun cliente corrisponde ai dati inseriti. Compila il form completo.",
          variant: "destructive",
        });
        setClientMode("new");
      }
    } catch (error) {
      console.error("Lookup error:", error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast({
        title: "Errore",
        description: "Inserisci il codice di verifica a 6 cifre",
        variant: "destructive",
      });
      return;
    }

    if (!pendingClient) {
      toast({
        title: "Errore",
        description: "Cliente non trovato. Riprova.",
        variant: "destructive",
      });
      setClientVerificationStep("lookup");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      // Verify OTP via custom edge function
      const response = await supabase.functions.invoke('verify-code-and-login', {
        body: {
          email: pendingClient.client_email,
          code: otpCode,
          purpose: 'contact_verification',
        },
      });

      if (response.error || response.data?.error) {
        console.error("OTP verification error:", response.error || response.data?.error);
        throw new Error(response.data?.error || "Codice non valido o scaduto. Riprova.");
      }

      setRecognizedClient(pendingClient);
      setClientVerificationStep("verified");
      toast({
        title: "Identità verificata!",
        description: `Benvenuto ${pendingClient.client_name}`,
      });
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Errore",
        description: error.message || "Codice non valido",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleClearRecognizedClient = () => {
    setRecognizedClient(null);
    setPendingClient(null);
    setLookupValue("");
    setOtpCode("");
    setClientVerificationStep("lookup");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    // Bot detection
    if (formData.honeypot) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        resetForm();
      }, 3000);
      return;
    }

    // Validate based on mode
    if (recognizedClient) {
      const validationResult = recognizedClientSchema.safeParse({
        subject: formData.subject,
        message: formData.message,
      });

      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
        toast({
          title: "Errore di validazione",
          description: "Controlla i campi evidenziati",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      const { error } = await supabase.from("contact_tickets").insert({
        name: recognizedClient.client_name,
        email: recognizedClient.client_email,
        phone: recognizedClient.client_phone,
        subject: validationResult.data.subject,
        message: validationResult.data.message,
      });

      setIsSubmitting(false);

      if (error) {
        toast({
          title: "Errore",
          description: "Si è verificato un errore. Riprova più tardi.",
          variant: "destructive",
        });
      } else {
        handleSuccess();
      }
    } else {
      // New client validation
      const validationResult = newClientSchema.safeParse({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      });

      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
        toast({
          title: "Errore di validazione",
          description: "Controlla i campi evidenziati",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      const fullPhone = formData.phone ? `${countryCode} ${formData.phone}` : null;

      const { error } = await supabase.from("contact_tickets").insert({
        name: validationResult.data.name,
        email: validationResult.data.email,
        phone: fullPhone,
        subject: validationResult.data.subject,
        message: validationResult.data.message,
      });

      setIsSubmitting(false);

      if (error) {
        toast({
          title: "Errore",
          description: "Si è verificato un errore. Riprova più tardi.",
          variant: "destructive",
        });
      } else {
        handleSuccess();
      }
    }
  };

  const handleSuccess = () => {
    setIsSubmitted(true);
    toast({
      title: "Messaggio inviato!",
      description: "Ti risponderò il prima possibile.",
    });

    setTimeout(() => {
      setIsSubmitted(false);
      resetForm();
    }, 3000);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", subject: "", message: "", honeypot: "" });
    setCountryCode("+39");
    setFormErrors({});
    setRecognizedClient(null);
    setPendingClient(null);
    setLookupValue("");
    setOtpCode("");
    setClientVerificationStep("lookup");
    setClientMode("new");
  };

  const contactInfo = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "+39 328 268 4828",
      href: "https://wa.me/393282684828",
      color: "text-green-500",
    },
    {
      icon: Mail,
      label: "Email",
      value: "me@giuseppemastronardi.dev",
      href: "mailto:me@giuseppemastronardi.dev",
      color: "text-primary",
    },
  ];

  return (
    <section id="contatti" className="py-24 lg:py-32 bg-secondary/30 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Contatti
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Parliamo del tuo <span className="text-gradient">progetto</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Hai bisogno di un consiglio o vuoi discutere un progetto? Contattami
            direttamente o compila il form.
          </p>
        </motion.div>

        {/* Contact Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12"
        >
          {contactInfo.map((contact, index) => (
            <a
              key={index}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border border-border rounded-2xl p-6 card-shadow hover:border-primary/50 transition-all group flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center ${contact.color}`}>
                <contact.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{contact.label}</p>
                <p className="font-medium group-hover:text-primary transition-colors">
                  {contact.value}
                </p>
              </div>
            </a>
          ))}
        </motion.div>

        {/* Contact Form */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-8 lg:p-10 card-shadow"
          >
            <div className="text-center mb-8">
              <h3 className="font-display text-xl font-bold mb-2">
                Oppure invia un messaggio
              </h3>
              <p className="text-muted-foreground text-sm">
                Riceverò la tua richiesta come ticket e ti risponderò al più presto
              </p>
            </div>

            {/* Client Recognition Tabs */}
            <Tabs value={clientMode} onValueChange={(v) => setClientMode(v as "new" | "existing")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <User size={16} />
                  Nuovo contatto
                </TabsTrigger>
                <TabsTrigger value="existing" className="flex items-center gap-2">
                  <Search size={16} />
                  Sono già cliente
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="mt-4">
                {clientVerificationStep === "lookup" && (
                  <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
                    <p className="text-sm text-muted-foreground">
                      Inserisci il tuo codice cliente, email o numero di telefono. Riceverai un codice di verifica via email.
                    </p>
                    <div className="flex gap-2">
                      <Select value={lookupType} onValueChange={(v) => setLookupType(v as "code" | "email" | "phone")}>
                        <SelectTrigger className="w-[140px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-50">
                          <SelectItem value="code">Codice</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefono</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={
                          lookupType === "code" ? "CLI00001" :
                          lookupType === "email" ? "tua@email.it" :
                          "328 123 4567"
                        }
                        value={lookupValue}
                        onChange={(e) => setLookupValue(e.target.value)}
                        className="flex-1 bg-background"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLookupClient();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={handleLookupClient}
                        disabled={isLookingUp}
                      >
                        {isLookingUp ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <Search size={16} />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {clientVerificationStep === "otp-sent" && pendingClient && (
                  <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield size={24} className="text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Codice di verifica inviato a:
                      </p>
                      <p className="font-medium">{maskEmail(pendingClient.client_email)}</p>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="text-center text-2xl tracking-widest bg-background"
                        maxLength={6}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyOtp();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleClearRecognizedClient}
                        className="flex-1"
                      >
                        <X size={16} className="mr-2" />
                        Annulla
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otpCode.length < 6}
                        className="flex-1"
                      >
                        {isVerifyingOtp ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle size={16} className="mr-2" />
                            Verifica
                          </>
                        )}
                      </Button>
                    </div>
                    {resendCountdown > 0 ? (
                      <p className="text-xs text-muted-foreground text-center">
                        Il codice è valido per 5 minuti. Puoi richiederne uno nuovo tra <span className="font-medium text-primary">{resendCountdown}s</span>
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={handleResendOtp}
                        disabled={isResending}
                      >
                        {isResending ? (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                        ) : (
                          <Send size={14} className="mr-2" />
                        )}
                        {isResending ? "Invio in corso..." : "Non hai ricevuto il codice? Rinvia"}
                      </Button>
                    )}
                  </div>
                )}

                {clientVerificationStep === "verified" && recognizedClient && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{recognizedClient.client_name}</p>
                          <p className="text-sm text-muted-foreground">{maskEmail(recognizedClient.client_email)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearRecognizedClient}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.honeypot}
                  onChange={(e) =>
                    setFormData({ ...formData, honeypot: e.target.value })
                  }
                />
              </div>

              {/* Show full form only for new clients or if no client is recognized */}
              {clientMode === "new" || !recognizedClient ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-2"
                      >
                        Nome
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={100}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Il tuo nome"
                        className={`bg-secondary/50 border-border focus:border-primary ${formErrors.name ? 'border-destructive' : ''}`}
                      />
                      {formErrors.name && (
                        <p className="text-destructive text-xs mt-1">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        maxLength={255}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="tua@email.it"
                        className={`bg-secondary/50 border-border focus:border-primary ${formErrors.email ? 'border-destructive' : ''}`}
                      />
                      {formErrors.email && (
                        <p className="text-destructive text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium mb-2"
                      >
                        WhatsApp (opzionale)
                      </label>
                      <div className="flex gap-2">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="w-[140px] bg-secondary/50 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border z-50">
                            {countryCodes.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <span className="flex items-center gap-2">
                                  <span>{country.flag}</span>
                                  <span>{country.code}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s]/g, '') })
                          }
                          placeholder="328 123 4567"
                          className="flex-1 bg-secondary/50 border-border focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium mb-2"
                >
                  Oggetto
                </label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  maxLength={200}
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Di cosa hai bisogno?"
                  className={`bg-secondary/50 border-border focus:border-primary ${formErrors.subject ? 'border-destructive' : ''}`}
                />
                {formErrors.subject && (
                  <p className="text-destructive text-xs mt-1">{formErrors.subject}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                >
                  Messaggio
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  maxLength={5000}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Descrivi brevemente il tuo progetto o la tua richiesta..."
                  className={`bg-secondary/50 border-border focus:border-primary resize-none ${formErrors.message ? 'border-destructive' : ''}`}
                />
                {formErrors.message && (
                  <p className="text-destructive text-xs mt-1">{formErrors.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting || isSubmitted || (clientMode === "existing" && !recognizedClient)}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle size={20} />
                    Messaggio Inviato
                  </>
                ) : isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Invia Messaggio
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};