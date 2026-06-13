"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "@/lib/animations/gsap-setup";

type Props = {
  children: string;
  /** Stagger delay per character/word in seconds. Default 0.03. */
  stagger?: number;
  /** Animation duration per element in seconds. Default 0.5. */
  duration?: number;
  /** Split mode: by line (br) or by word. Default "line". */
  mode?: "line" | "word";
  /** Whether to play immediately or wait for external trigger. Default true. */
  play?: boolean;
  className?: string;
};

export function TextSplit({
  children,
  stagger = 0.03,
  duration = 0.5,
  mode = "line",
  play = true,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || !play) return;

      const spans = ref.current.querySelectorAll<HTMLElement>(".split-target");
      if (spans.length === 0) return;

      gsap.from(spans, {
        y: 24,
        opacity: 0,
        duration,
        stagger,
        ease: "power3.out",
      });
    },
    { scope: ref, dependencies: [play] },
  );

  if (mode === "line") {
    // Split by <br> — each line becomes a span
    const lines = children.split("\n");
    return (
      <div ref={ref} className={className}>
        {lines.map((line, i) => (
          <span
            key={i}
            className="split-target block"
            style={{ overflow: "hidden" }}
          >
            <span className="block">{line}</span>
          </span>
        ))}
      </div>
    );
  }

  // Split by word
  const words = children.split(" ");
  return (
    <div ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="split-target inline-block"
          style={{ overflow: "hidden" }}
        >
          <span className="inline-block">
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
