import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, CheckCircle, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countryCode, setCountryCode] = useState("+39");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    honeypot: "", // Anti-bot honeypot field
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Bot detection: if honeypot field is filled, silently reject
    if (formData.honeypot) {
      console.log("Bot detected");
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "", honeypot: "" });
        setCountryCode("+39");
      }, 3000);
      return;
    }

    setIsSubmitting(true);

    // Combine country code with phone number if phone is provided
    const fullPhone = formData.phone ? `${countryCode} ${formData.phone}` : null;

    const { error } = await supabase.from("contact_tickets").insert({
      name: formData.name,
      email: formData.email,
      phone: fullPhone,
      subject: formData.subject,
      message: formData.message,
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Error submitting ticket:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive",
      });
    } else {
      setIsSubmitted(true);
      toast({
        title: "Messaggio inviato!",
        description: "Ti risponderò il prima possibile.",
      });

      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "", honeypot: "" });
        setCountryCode("+39");
      }, 3000);
    }
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field - hidden from users, visible to bots */}
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
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Il tuo nome"
                    className="bg-secondary/50 border-border focus:border-primary"
                  />
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
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="tua@email.it"
                    className="bg-secondary/50 border-border focus:border-primary"
                  />
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
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Di cosa hai bisogno?"
                  className="bg-secondary/50 border-border focus:border-primary"
                />
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
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Descrivi brevemente il tuo progetto o la tua richiesta..."
                  className="bg-secondary/50 border-border focus:border-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting || isSubmitted}
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