import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Global GSAP-powered scroll & hover effects for the landing page.
 * Targets only non-framer-motion elements to avoid conflicting inline styles.
 */
export const GsapEffects = () => {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      // 1. Scroll progress bar
      gsap.to("#gsap-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { scrub: 0.3, start: 0, end: "max" },
      });

      // 2. Parallax on decorative blurred blobs
      gsap.utils.toArray<HTMLElement>("main .blur-3xl").forEach((el, i) => {
        gsap.to(el, {
          yPercent: i % 2 === 0 ? -25 : 20,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest("section") ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // 3. Section separators: soft scale-in of card surfaces on scroll
      gsap.utils.toArray<HTMLElement>("main .card-shadow").forEach((card) => {
        gsap.fromTo(
          card,
          { filter: "blur(6px)" },
          {
            filter: "blur(0px)",
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: card, start: "top 92%", once: true },
          }
        );

        // 4. Magnetic hover lift
        const enter = () =>
          gsap.to(card, { y: -6, scale: 1.015, duration: 0.35, ease: "power3.out" });
        const leave = () =>
          gsap.to(card, { y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
        card.addEventListener("mouseenter", enter);
        card.addEventListener("mouseleave", leave);
      });

      // 5. Scrubbed timelines: every section is tied to the scroll position
      gsap.utils.toArray<HTMLElement>("main section").forEach((section) => {
        const wrap = section.querySelector<HTMLElement>(".container");
        if (!wrap) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            scrub: 1,
            trigger: section,
            start: "top 90%",
            end: "bottom 30%",
          },
        });

        tl.fromTo(
          wrap,
          { y: 60, opacity: 0.35 },
          { y: 0, opacity: 1, ease: "power2.out", duration: 1 }
        ).to(wrap, { y: -30, opacity: 1, ease: "none", duration: 1 });

        // Grid children slide in with a scrubbed stagger
        const items = section.querySelectorAll<HTMLElement>(
          ":scope .container [class*='grid'] > *"
        );
        if (items.length) {
          gsap.fromTo(
            items,
            { y: 40, opacity: 0.2 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              stagger: 0.08,
              scrollTrigger: {
                scrub: 1,
                trigger: section,
                start: "top 85%",
                end: "center 55%",
              },
            }
          );
        }
      });

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      id="gsap-progress"
      className="fixed top-0 left-0 h-1 w-full origin-left scale-x-0 bg-primary z-[60] pointer-events-none"
    />
  );
};
