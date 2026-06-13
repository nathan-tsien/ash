"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "@/lib/animations/gsap-setup";

type Props = {
  children: ReactNode;
  /** Scale factor on hover. Default 1.02. */
  scale?: number;
  /** Y translation on hover in px. Default -4. */
  y?: number;
  className?: string;
};

export function HoverScale({ children, scale = 1.02, y = -4, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const el = ref.current;

      const enter = () => {
        gsap.to(el, {
          scale,
          y,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
      };

      const leave = () => {
        gsap.to(el, {
          scale: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
      };

      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);

      return () => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
