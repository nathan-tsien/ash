/** GSAP tween configuration vars. */
type TweenVars = gsap.TweenVars;

/** Entrance for a single message bubble. */
export function messageEntrance(): TweenVars {
  return {
    autoAlpha: 0,
    y: 8,
    duration: 0.3,
    ease: "power2.out",
  };
}

/** Staggered entrance for multiple message bubbles. */
export function messageStagger(): TweenVars {
  return {
    autoAlpha: 0,
    y: 8,
    stagger: 0.06,
    duration: 0.3,
    ease: "power2.out",
  };
}

/** Fade out content during pane collapse. */
export function fadeOut(duration = 0.15): TweenVars {
  return {
    autoAlpha: 0,
    duration,
    ease: "power3.out",
  };
}

/** Fade in content during pane expand. */
export function fadeIn(duration = 0.2): TweenVars {
  return {
    autoAlpha: 1,
    duration,
    ease: "power2.out",
  };
}
