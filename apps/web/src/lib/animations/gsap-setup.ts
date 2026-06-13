import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

gsap.defaults({
  duration: 0.3,
  ease: "power2.out",
  overwrite: "auto",
});

// Respect prefers-reduced-motion globally (MOTION-4).
// timeScale on the global timeline collapses ALL tweens — including those with
// explicit per-call durations, which gsap.defaults() cannot override.
// Guard against SSR — matchMedia requires a browser environment.
if (typeof window !== "undefined") {
  gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
    gsap.globalTimeline.timeScale(1000);
    // Revert when the preference stops matching.
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  });
}
