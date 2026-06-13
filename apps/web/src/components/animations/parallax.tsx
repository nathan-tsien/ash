"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "@/lib/animations/gsap-setup";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: ReactNode;
  /** Parallax factor — higher = more movement. Default 0.3. */
  factor?: number;
  /** Direction of movement. Default "y". */
  direction?: "y" | "x";
  className?: string;
};

export function Parallax({
  children,
  factor = 0.3,
  direction = "y",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const prop = direction === "y" ? "y" : "x";
      const distance = factor * 100;

      // Scrubbed ScrollTriggers are position-linked, not time-based, so the
      // global timeScale collapse in gsap-setup cannot disable them (MOTION-4).
      // Skip creating the tween entirely under prefers-reduced-motion.
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          [prop]: distance,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
