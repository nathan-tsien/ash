// Automated WCAG AA gate for the Neutral Stone ramp (COLOR-3). No deps.
// Run: node scripts/check-contrast.mjs   (exit 1 on any failure)
const hex = (h) => {
  const n = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [label, fg, bg, minRatio]
const PAIRS = [
  // light — body text needs >= 4.5
  ["L muted-fg / background", "#6a6a66", "#f5f5f4", 4.5],
  ["L muted-fg / card", "#6a6a66", "#ffffff", 4.5],
  ["L muted-fg / muted", "#6a6a66", "#f0f0ee", 4.5],
  ["L muted-fg / workspace", "#6a6a66", "#fafafa", 4.5],
  ["L foreground / background", "#1c1c1a", "#f5f5f4", 4.5],
  ["L primary-fg / primary", "#ffffff", "#1c1c1a", 4.5],
  // light status (unchanged values, regression guard)
  ["L running-fg / running-soft", "#1d4ed8", "#eff6ff", 4.5],
  ["L success-fg / success-soft", "#047857", "#ecfdf5", 4.5],
  ["L warning-fg / warning-soft", "#b45309", "#fffbeb", 4.5],
  // dark — body text >= 4.5
  ["D muted-fg / background", "#b1b1ab", "#1a1a19", 4.5],
  ["D muted-fg / card", "#b1b1ab", "#232322", 4.5],
  ["D foreground / background", "#ededeb", "#1a1a19", 4.5],
  ["D primary-fg / primary", "#1a1a19", "#ededeb", 4.5],
  ["D running-fg / running-soft", "#93c5fd", "#1c2940", 4.5],
  ["D success-fg / success-soft", "#6ee7b7", "#122b22", 4.5],
  ["D warning-fg / warning-soft", "#fcd34d", "#2e2510", 4.5],
];

let failed = 0;
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1  (min ${min})  ${label}`);
}
if (failed) {
  console.error(`\n${failed} pair(s) below AA — adjust the hex in globals.css and re-run.`);
  process.exit(1);
}
console.log("\nAll pairs meet WCAG AA.");
