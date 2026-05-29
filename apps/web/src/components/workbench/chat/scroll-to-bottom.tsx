"use client";

import { Button } from "@ash/ui/button";
import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";

interface ScrollToBottomProps {
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  targetRef: RefObject<HTMLDivElement | null>;
}

export function ScrollToBottom({ scrollAreaRef, targetRef }: ScrollToBottomProps) {
  const t = useTranslations("Workbench");
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    const checkDistance = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setVisible(distanceFromBottom > 200);
    };

    viewport.addEventListener("scroll", checkDistance, { passive: true });
    checkDistance();

    return () => viewport.removeEventListener("scroll", checkDistance);
  }, [scrollAreaRef]);

  // GSAP fade animation on visibility change
  useEffect(() => {
    if (visible === prevVisibleRef.current) return;
    prevVisibleRef.current = visible;

    if (buttonRef.current) {
      if (visible) {
        gsap.fromTo(
          buttonRef.current,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" },
        );
      } else {
        gsap.to(buttonRef.current, {
          autoAlpha: 0,
          y: 8,
          duration: 0.15,
          ease: "power2.in",
        });
      }
    }
  }, [visible]);

  const handleClick = useCallback(() => {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [targetRef]);

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      size="sm"
      type="button"
      className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 gap-1.5 rounded-full shadow-md"
      style={{ visibility: "hidden", opacity: 0 }}
      aria-label={t("scrollToBottom")}
      onClick={handleClick}
    >
      <ArrowDown className="size-3.5" />
      <span className="text-xs">{t("scrollToBottom")}</span>
    </Button>
  );
}
