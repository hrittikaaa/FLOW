import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Same palette used by the analytics chart – keeps colors consistent across views. */
const CATEGORY_PALETTE = ["#F2A65A", "#6FD6C6", "#E8697D", "#8B8AFF", "#F2D95C", "#7FC8F8"];

/** Returns a stable hex color for a given category string (deterministic hash). */
export function getCategoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

/**
 * Returns a CSS gradient string for a category's border.
 * Sweeps from the category color → an adjacent palette color → back,
 * giving a full-perimeter glowing gradient border look.
 */
export function getCategoryGradient(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  const idx = hash % CATEGORY_PALETTE.length;
  const c1 = CATEGORY_PALETTE[idx];
  const c2 = CATEGORY_PALETTE[(idx + 2) % CATEGORY_PALETTE.length];
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c1} 100%)`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatMinutesAsHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
