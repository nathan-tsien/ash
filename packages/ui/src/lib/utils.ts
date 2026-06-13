import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the named type-scale utilities (TYPE-2) so they merge
// as font sizes, not text colors (default heuristic misclassifies text-label etc.)
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["caption", "label", "body-sm", "body", "body-lg"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
