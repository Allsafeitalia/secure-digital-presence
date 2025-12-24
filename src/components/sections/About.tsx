import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2, Award, Shield, Terminal, Code2, Phone } from "lucide-react";

const certifications = [
  {
    icon: Shield,
    title: "CompTIA Security+",
    description: "Certificazione internazionale in cybersecurity, threat analysis e network security",
  },
  {
    icon: Terminal,
    title: "Penetration Tester",
    description: "Specializzato in vulnerability assessment, ethical hacking e security auditing",
  },
  {
    icon: Award,
    title: "Sistemista UNIX",
    description: "Gestione avanzata di sistemi Linux/UNIX, automazione e infrastrutture server",
  },
  {
    icon: Phone,
    title: "IVL - Asterisk18 PBX",
    description: "Certificato nella configurazione e gestione di sistemi VoIP aziendali",
  },
];

const techStack = {
  languages: ["Python", "Ruby", "JavaScript", "TypeScript"],
  frameworks: ["ReactJS", "AngularJS", "Django", "Node.js"],
  systems: ["Linux", "UNIX", "Docker", "Kubernetes", "AWS", "Azure"],
};

const services = [
  "Security Assessment e Penetration Testing per identificare vulnerabilità",
  "Progettazione e gestione infrastrutture server Linux/UNIX",
  "Sviluppo applicazioni web full-stack con React e Django",
  "Configurazione sistemi VoIP e centralini Asterisk",
  "Consulenza strategica IT per ottimizzare processi aziendali",
  "Formazione team su best practice di sicurezza",
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
        {/* Header */}
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
            Giuseppe Mastronardi{" "}
            <span className="text-gradient">Security & DevOps</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sono un consulente IT con una forte passione per la sicurezza informatica 
            e lo sviluppo software. Lavoro con aziende di ogni dimensione per proteggere 
            le loro infrastrutture, automatizzare i processi e costruire soluzioni web 
            scalabili e performanti.
          </p>
        </motion.div>

        {/* Certifications Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
            <Award className="text-primary" size={24} />
            Certificazioni
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="p-5 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors card-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <cert.icon size={20} className="text-primary" />
                </div>
                <h4 className="font-display font-semibold text-sm mb-2">
                  {cert.title}
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {cert.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Tech Stack */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-card border border-border rounded-2xl p-8 card-shadow">
              <h3 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <Code2 className="text-primary" size={24} />
                Stack Tecnologico
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Linguaggi</h4>
                  <div className="flex flex-wrap gap-2">
                    {techStack.languages.map((lang, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Framework</h4>
                  <div className="flex flex-wrap gap-2">
                    {techStack.frameworks.map((fw, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-full font-medium"
                      >
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Sistemi & Cloud</h4>
                  <div className="flex flex-wrap gap-2">
                    {techStack.systems.map((sys, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-full font-medium"
                      >
                        {sys}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - What I Do */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="bg-card border border-border rounded-2xl p-8 card-shadow">
              <h3 className="font-display text-xl font-semibold mb-6">
                Cosa faccio per le aziende
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Lavoro come partner tecnologico per le aziende, non come semplice fornitore. 
                Analizzo le esigenze, propongo soluzioni concrete e resto al fianco del cliente 
                per garantire risultati misurabili.
              </p>

              <ul className="space-y-3">
                {services.map((service, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="flex items-start gap-3 text-muted-foreground text-sm"
                  >
                    <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
                    <span>{service}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
