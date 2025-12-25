import { motion } from "framer-motion";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <motion.a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("#home");
            }}
            className="font-display font-bold text-xl text-foreground hover:text-primary transition-colors"
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-gradient">giuseppe</span>mastronardi.dev
          </motion.a>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {["Home", "Chi Sono", "Servizi", "Come Lavoro", "Contatti"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(
                      `#${item === "Home" ? "home" : item.toLowerCase().replace(" ", "-")}`
                    );
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  {item}
                </a>
              )
            )}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} Made with ❤️ by{" "}
            <a 
              href="https://giuseppemastronardi.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              giuseppemastronardi.dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
