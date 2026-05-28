"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

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
      if (!ref.current) return;

      const prop = direction === "y" ? "y" : "x";
      const distance = factor * 100;

      gsap.to(ref.current, {
        [prop]: distance,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
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
