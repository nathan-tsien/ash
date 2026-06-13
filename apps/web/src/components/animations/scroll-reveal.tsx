"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "@/lib/animations/gsap-setup";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: ReactNode;
  /** Y offset in px for the entrance. Default 40. */
  y?: number;
  /** X offset in px for the entrance. Default 0. */
  x?: number;
  /** Animation duration in seconds. Default 0.8. */
  duration?: number;
  /** Stagger delay in seconds (only when wrapping multiple children). */
  stagger?: number;
  /** ScrollTrigger start position. Default "top 85%". */
  start?: string;
  className?: string;
};

export function ScrollReveal({
  children,
  y = 40,
  x = 0,
  duration = 0.8,
  stagger,
  start = "top 85%",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const targets = stagger
        ? gsap.utils.toArray(ref.current.children)
        : ref.current;

      gsap.from(targets, {
        y,
        x,
        opacity: 0,
        duration,
        stagger: stagger ?? 0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
