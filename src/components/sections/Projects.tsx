import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Github, Star, GitFork, ExternalLink, Code2, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  updated_at: string;
}

const GITHUB_USER = "allsafeitalia";
const GITHUB_PROFILE = `https://github.com/${GITHUB_USER}`;

const languageColors: Record<string, string> = {
  JavaScript: "bg-yellow-500/15 text-yellow-700",
  TypeScript: "bg-blue-500/15 text-blue-700",
  Python: "bg-green-500/15 text-green-700",
  CSS: "bg-purple-500/15 text-purple-700",
  HTML: "bg-orange-500/15 text-orange-700",
};

export const Projects = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`
        );
        if (!res.ok) throw new Error("GitHub API error");
        const data: Repo[] = await res.json();
        setRepos(data.filter((r) => !r.fork));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const displayed = repos.slice(0, 9);

  return (
    <section id="progetti" className="py-24 lg:py-32 relative bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-12"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            <Github size={16} />
            Progetti Open Source
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            I miei progetti su <span className="text-gradient">GitHub</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Uso GitHub per pubblicare e condividere il mio lavoro: script, tool,
            piccole applicazioni web e guide tecniche. Tutti i progetti sono
            open source e liberamente consultabili — il codice è il miglior
            biglietto da visita.
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-6 bg-card border border-border rounded-xl h-44 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center card-shadow">
            <Github size={40} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-6">
              Non riesco a caricare i repository in questo momento. Puoi
              visitare direttamente il mio profilo GitHub.
            </p>
            <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">
              <Button variant="hero">
                <Github className="w-4 h-4 mr-2" />
                Vai al profilo GitHub
              </Button>
            </a>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {displayed.map((repo, index) => (
                <motion.a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.06 }}
                  className="group p-6 bg-card border border-border rounded-xl hover:border-primary/40 transition-all card-shadow flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FolderGit2 size={18} className="text-primary" />
                      </div>
                      <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {repo.name}
                      </h3>
                    </div>
                    <ExternalLink
                      size={16}
                      className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                    {repo.description || "Progetto pubblicato su GitHub"}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span
                        className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                          languageColors[repo.language] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Code2 size={12} />
                        {repo.language}
                      </span>
                    )}
                    {repo.stargazers_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} />
                        {repo.stargazers_count}
                      </span>
                    )}
                    {repo.forks_count > 0 && (
                      <span className="flex items-center gap-1">
                        <GitFork size={12} />
                        {repo.forks_count}
                      </span>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">
                <Button variant="hero" size="lg">
                  <Github className="w-5 h-5 mr-2" />
                  Tutti i progetti su GitHub
                </Button>
              </a>
              <p className="text-sm text-muted-foreground">
                {repos.length} repository pubblici · seguimi su{" "}
                <a
                  href={GITHUB_PROFILE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  @{GITHUB_USER}
                </a>
              </p>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};
