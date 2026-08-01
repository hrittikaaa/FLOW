/** Shared color palette — 10 distinct colors to comfortably handle most category counts. */
export const SERIES_COLORS = [
  "#F2A65A", // amber
  "#6FD6C6", // teal
  "#E8697D", // rose
  "#8B8AFF", // violet
  "#F2D95C", // yellow
  "#7FC8F8", // sky
  "#A8E6A3", // mint
  "#FF9ECD", // pink
  "#C4A0FF", // lavender
  "#FFB347", // peach
];

/**
 * Builds a stable category → color map from ALL categories in the user's history.
 * Categories are sorted alphabetically so the mapping is consistent regardless
 * of which subset happens to appear in the current week or month.
 *
 * Usage:
 *   const colorMap = buildColorMap(allCategories);
 *   fill={colorMap[cat] ?? SERIES_COLORS[0]}
 */
export function buildColorMap(allCategories: string[]): Record<string, string> {
  const sorted = [...allCategories].sort((a, b) => a.localeCompare(b));
  const map: Record<string, string> = {};
  sorted.forEach((cat, i) => {
    map[cat] = SERIES_COLORS[i % SERIES_COLORS.length];
  });
  return map;
}

/** Convenience: extract unique categories from a set. */
export function uniqueCategories(categorySet: Set<string>): string[] {
  return Array.from(categorySet);
}

