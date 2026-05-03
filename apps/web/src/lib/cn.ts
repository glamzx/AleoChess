import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-style class composer: clsx + tailwind-merge.
 * Use everywhere classes are conditionally composed.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
