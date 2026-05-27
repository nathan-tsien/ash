import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

gsap.defaults({
  duration: 0.3,
  ease: "power2.out",
  overwrite: "auto",
});

// Respect prefers-reduced-motion globally.
// Individual components check context.conditions.reduceMotion to set duration: 0.
gsap.matchMedia().add(
  { reduceMotion: "(prefers-reduced-motion: reduce)" },
  (context) => {
    if (context.conditions?.reduceMotion) {
      gsap.defaults({ duration: 0 });
    }
  },
);
