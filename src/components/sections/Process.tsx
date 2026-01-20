import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Search, Lightbulb, HeadphonesIcon, CheckCircle2, ArrowRight, Clock, MessageSquare, FileCheck, Settings } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Analisi Approfondita",
    subtitle: "Capire prima di agire",
    description:
      "Non propongo soluzioni preconfezionate. Inizio sempre con un'analisi dettagliata della tua situazione attuale, ascoltando le tue esigenze specifiche e identificando criticità e opportunità.",
    details: [
      "Colloquio iniziale per capire obiettivi e priorità",
      "Audit tecnico dell'infrastruttura esistente",
      "Identificazione di rischi e aree di miglioramento",
      "Definizione chiara del perimetro di intervento",
    ],
    duration: "1-2 giorni",
  },
  {
    number: "02",
    icon: Lightbulb,
    title: "Proposta e Sviluppo",
    subtitle: "Trasparenza su tempi e costi",
    description:
      "Ti presento un piano dettagliato con tempi, costi e risultati attesi. Niente sorprese: sai esattamente cosa aspettarti. Implemento la soluzione spiegando ogni passaggio in modo chiaro.",
    details: [
      "Proposta scritta con preventivo dettagliato",
      "Roadmap con milestones e tempistiche",
      "Implementazione con aggiornamenti costanti",
      "Test e validazione prima del rilascio",
    ],
    duration: "Variabile",
  },
  {
    number: "03",
    icon: HeadphonesIcon,
    title: "Supporto Continuo",
    subtitle: "Non ti lascio solo",
    description:
      "Il lavoro non finisce con il lancio. Resto al tuo fianco per monitorare, aggiornare e intervenire quando serve. Hai un problema? Rispondo rapidamente.",
    details: [
      "Monitoraggio proattivo dei sistemi",
      "Aggiornamenti di sicurezza e performance",
      "Supporto prioritario via email e telefono",
      "Report periodici sullo stato dei servizi",
    ],
    duration: "Continuativo",
  },
];

const workValues = [
  {
    icon: Clock,
    title: "Rispetto delle Scadenze",
    description: "I tempi concordati sono sacri. Ti comunico subito se ci sono imprevisti.",
  },
  {
    icon: MessageSquare,
    title: "Comunicazione Chiara",
    description: "Niente tecnicismi inutili. Ti spiego tutto in modo comprensibile.",
  },
  {
    icon: FileCheck,
    title: "Documentazione Completa",
    description: "Ogni progetto include documentazione dettagliata per te e il tuo team.",
  },
  {
    icon: Settings,
    title: "Soluzioni su Misura",
    description: "Non vendo pacchetti standard. Ogni soluzione è pensata per le tue esigenze.",
  },
];

export const Process = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="come-lavoro" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-primary/3 to-transparent" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Come Lavoro
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Un approccio <span className="text-gradient">strutturato</span> e trasparente
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ogni progetto segue un metodo collaudato che garantisce risultati concreti, 
            comunicazione chiara e rispetto dei tempi. Ecco come lavoro con i miei clienti.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="space-y-12 lg:space-y-16 mb-24">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 * index }}
              className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon size={28} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-primary font-bold text-sm">FASE {step.number}</span>
                    <h3 className="font-display text-2xl lg:text-3xl font-bold">
                      {step.title}
                    </h3>
                  </div>
                </div>
                
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  {step.description}
                </p>

                <ul className="space-y-3 mb-6">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm">
                  <Clock size={16} className="text-primary" />
                  <span className="text-muted-foreground">Durata: </span>
                  <span className="font-medium text-foreground">{step.duration}</span>
                </div>
              </div>

              {/* Visual */}
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <div className="relative">
                  <div className="bg-card border border-border rounded-3xl p-8 lg:p-10 card-shadow">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-6xl lg:text-7xl font-display font-bold text-primary/20">
                        {step.number}
                      </span>
                      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                        <step.icon size={32} className="text-primary-foreground" />
                      </div>
                    </div>
                    <h4 className="font-display text-xl font-semibold mb-2 text-foreground">
                      {step.subtitle}
                    </h4>
                    <p className="text-muted-foreground">
                      {step.description.split('.')[0]}.
                    </p>
                  </div>
                  
                  {/* Connection arrow to next step */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -bottom-8 left-1/2 -translate-x-1/2 justify-center">
                      <ArrowRight size={24} className="text-primary/30 rotate-90" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Work Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="text-center mb-12">
            <h3 className="font-display text-2xl lg:text-3xl font-bold mb-4">
              I miei principi di lavoro
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Valori che guidano ogni progetto e ogni interazione con i clienti.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workValues.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 card-shadow hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon size={24} className="text-primary" />
                </div>
                <h4 className="font-display font-semibold mb-2">{value.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
