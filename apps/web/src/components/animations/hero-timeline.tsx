"use client";

import { type ReactNode, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps hero section content and plays a staggered GSAP timeline entrance.
 * Expects children in order: kicker, title, body, mockup, cta.
 */
export function HeroTimeline({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      const kicker = ref.current.querySelector("[data-anim='kicker']");
      const title = ref.current.querySelector("[data-anim='title']");
      const titleLines = title
        ? gsap.utils.toArray(title.querySelectorAll(".split-line"))
        : [];
      const body = ref.current.querySelector("[data-anim='body']");
      const mockup = ref.current.querySelector("[data-anim='mockup']");
      const mockupCols = mockup
        ? gsap.utils.toArray(mockup.querySelectorAll("[data-anim-col]"))
        : [];
      const cta = ref.current.querySelector("[data-anim='cta']");

      // Kicker
      if (kicker) {
        tl.from(kicker, { y: 20, opacity: 0, duration: 0.6 }, 0);
      }

      // Title lines stagger
      if (titleLines.length > 0) {
        tl.from(
          titleLines,
          { y: 30, opacity: 0, duration: 0.6, stagger: 0.15 },
          0.1,
        );
      }

      // Body
      if (body) {
        tl.from(body, { y: 20, opacity: 0, duration: 0.6 }, 0.4);
      }

      // Mockup
      if (mockup) {
        tl.from(
          mockup,
          { scale: 0.95, opacity: 0, duration: 0.7 },
          0.5,
        );
      }

      // Mockup internal columns
      if (mockupCols.length > 0) {
        tl.from(
          mockupCols,
          { x: (i) => (i === 0 ? -12 : i === 2 ? 12 : 0), opacity: 0, duration: 0.5, stagger: 0.1 },
          0.8,
        );
      }

      // CTA buttons
      if (cta) {
        tl.from(cta, { y: 15, opacity: 0, duration: 0.5 }, 0.9);
      }
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
