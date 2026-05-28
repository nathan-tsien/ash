import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

gsap.defaults({
  duration: 0.3,
  ease: "power2.out",
  overwrite: "auto",
});

// Respect prefers-reduced-motion globally.
// Guard against SSR — matchMedia requires a browser environment.
if (typeof window !== "undefined") {
  gsap.matchMedia().add(
    { reduceMotion: "(prefers-reduced-motion: reduce)" },
    (context) => {
      if (context.conditions?.reduceMotion) {
        gsap.defaults({ duration: 0 });
      }
    },
  );
}
