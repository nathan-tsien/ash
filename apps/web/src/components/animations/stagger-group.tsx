"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "@/lib/animations/gsap-setup";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: ReactNode;
  /** Stagger delay between children in seconds. Default 0.12. */
  stagger?: number;
  /** Y offset per child in px. Default 40. */
  y?: number;
  /** Animation duration per child in seconds. Default 0.7. */
  duration?: number;
  /** ScrollTrigger start position. Default "top 85%". */
  start?: string;
  className?: string;
};

export function StaggerGroup({
  children,
  stagger = 0.12,
  y = 40,
  duration = 0.7,
  start = "top 85%",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      gsap.from(ref.current.children, {
        y,
        opacity: 0,
        duration,
        stagger,
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
