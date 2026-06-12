/**
 * Pane geometry constants (design-guidelines SPACE-4).
 * GSAP timelines animate raw pixel widths and cannot read Tailwind utilities,
 * so these mirror the --spacing-sidebar/rail/workspace tokens in
 * packages/ui/src/globals.css. Change both places together (REV-2 geometry check).
 */
export const PANE_WIDTH = {
  sidebar: 260,
  rail: 56,
  workspace: 380,
} as const;
