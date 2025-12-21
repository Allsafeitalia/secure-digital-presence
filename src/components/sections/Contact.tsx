import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: "Messaggio inviato!",
      description: "Ti risponderò il prima possibile.",
    });

    // Reset form after delay
    setTimeout(() => {
      setIsSubmitted(false);
      (e.target as HTMLFormElement).reset();
    }, 3000);
  };

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
            Hai bisogno di un consiglio o vuoi discutere un progetto? Scrivimi
            e ti risponderò rapidamente.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-8 lg:p-10 card-shadow"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="tua@email.it"
                    className="bg-secondary/50 border-border focus:border-primary"
                  />
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

            {/* Email Alternative */}
            <div className="mt-8 pt-8 border-t border-border text-center">
              <p className="text-muted-foreground text-sm mb-3">
                Preferisci scrivere direttamente?
              </p>
              <a
                href="mailto:info@tuoemail.it"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail size={18} />
                info@tuoemail.it
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
