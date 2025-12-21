import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Search, Lightbulb, HeadphonesIcon } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Analisi",
    description:
      "Ascolto le tue esigenze, studio la situazione attuale e identifico criticità e opportunità. Nessuna soluzione preconfezionata: ogni progetto parte da te.",
  },
  {
    number: "02",
    icon: Lightbulb,
    title: "Soluzione",
    description:
      "Propongo un piano chiaro con tempi, costi e risultati attesi. Implemento la soluzione più adatta, spiegando ogni passaggio in modo semplice.",
  },
  {
    number: "03",
    icon: HeadphonesIcon,
    title: "Supporto Continuo",
    description:
      "Non ti lascio solo dopo il lancio. Monitoro, aggiorno e intervengo quando serve. Hai un problema? Rispondo velocemente.",
  },
];

export const Process = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="come-lavoro" className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Come Lavoro
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Un processo <span className="text-gradient">semplice</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Tre fasi per portare il tuo progetto dal problema alla soluzione,
            con trasparenza e chiarezza.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 * index }}
                className="relative"
              >
                <div className="text-center">
                  {/* Step Number */}
                  <div className="relative inline-block mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-secondary border-2 border-primary/30 flex items-center justify-center relative z-10">
                      <step.icon size={32} className="text-primary" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-semibold mb-4">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
