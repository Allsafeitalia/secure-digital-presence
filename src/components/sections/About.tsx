import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2, Award, Users, Clock } from "lucide-react";

const highlights = [
  {
    icon: Award,
    title: "Esperienza",
    description: "Anni di lavoro nel settore IT con progetti di ogni dimensione",
  },
  {
    icon: Users,
    title: "Clienti Soddisfatti",
    description: "Aziende e professionisti che si affidano ai miei servizi",
  },
  {
    icon: Clock,
    title: "Supporto Continuo",
    description: "Assistenza rapida e affidabile quando ne hai bisogno",
  },
];

const skills = [
  "Sicurezza informatica e protezione dati",
  "Gestione server Linux e Windows",
  "Hosting, VPS e soluzioni cloud",
  "Sviluppo siti web e e-commerce",
  "Backup e disaster recovery",
  "Ottimizzazione performance",
];

export const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="chi-sono" className="py-24 lg:py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      </div>

      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Chi Sono
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Consulente IT con un approccio{" "}
            <span className="text-gradient">pratico</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sono un professionista del settore informatico con esperienza nella
            gestione di sistemi, sicurezza e sviluppo web. Il mio obiettivo è
            semplice: aiutare chi lavora online a farlo in modo sicuro, stabile
            e senza pensieri.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Bio & Skills */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-8 card-shadow">
              <h3 className="font-display text-xl font-semibold mb-4">
                Il mio approccio
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Non vendo fumo. Analizzo la situazione, propongo soluzioni
                concrete e resto al tuo fianco per assicurarmi che tutto
                funzioni. Lavoro con trasparenza, spiegando ogni passaggio in
                modo chiaro.
              </p>

              <h4 className="font-medium text-foreground mb-4">
                Competenze principali:
              </h4>
              <ul className="space-y-3">
                {skills.map((skill, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                    <span>{skill}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Right Column - Highlights */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex gap-5 p-6 bg-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon size={24} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-lg mb-1">
                    {item.title}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
