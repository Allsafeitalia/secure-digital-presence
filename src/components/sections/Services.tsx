import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  Shield,
  Server,
  Globe,
  ShoppingCart,
  Wrench,
  MessageSquare,
} from "lucide-react";

const services = [
  {
    icon: Shield,
    title: "Sicurezza Informatica",
    description:
      "Protezione dati, firewall, antivirus aziendali, analisi vulnerabilità e conformità GDPR.",
  },
  {
    icon: Server,
    title: "Sistemistica e Server",
    description:
      "Configurazione e gestione server Linux/Windows, hosting, VPS e infrastrutture cloud.",
  },
  {
    icon: Globe,
    title: "Siti Web",
    description:
      "Realizzazione siti web professionali, responsive e ottimizzati per i motori di ricerca.",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce",
    description:
      "Creazione negozi online completi con gestione ordini, pagamenti e inventario.",
  },
  {
    icon: Wrench,
    title: "Manutenzione",
    description:
      "Aggiornamenti, backup, monitoraggio performance e interventi preventivi.",
  },
  {
    icon: MessageSquare,
    title: "Consulenza Tecnica",
    description:
      "Analisi delle esigenze, pianificazione IT e supporto nelle decisioni tecnologiche.",
  },
];

export const Services = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="servizi" className="py-24 lg:py-32 bg-secondary/30 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Servizi
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Come posso <span className="text-gradient">aiutarti</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Offro soluzioni complete per la tua presenza online e la gestione
            della tua infrastruttura IT.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="group"
            >
              <div className="h-full bg-card border border-border rounded-2xl p-8 card-shadow hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <service.icon size={28} className="text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
