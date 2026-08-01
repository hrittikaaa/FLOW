import type { SegmentKind, SegmentPlan } from "@/types";

export interface SessionRatio {
  totalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

/**
 * The "Dynamic Block" algorithm.
 *
 * Given a total time goal and a focus/break ratio, greedily lays down
 * focus -> break pairs (inserting a long break every N focus sessions)
 * until the remaining time runs out. The final trailing break is trimmed
 * if it would push the block past the goal, and a short final focus
 * segment is allowed (e.g. a 100-minute goal at 30/5 ends 30/5/30/5/30/5/10).
 *
 * This is intentionally deterministic and pure so it can run identically
 * on the client (for live preview while the user types) and be persisted
 * as `block_segments` rows once the user saves the block.
 */
export function generateSessionPlan(ratio: SessionRatio): SegmentPlan[] {
  const {
    totalMinutes,
    focusMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionsBeforeLongBreak,
  } = ratio;

  if (totalMinutes <= 0 || focusMinutes <= 0) return [];

  const segments: SegmentPlan[] = [];
  let remaining = totalMinutes;
  let focusCount = 0;
  let position = 0;

  while (remaining > 0) {
    // Lay down a full focus segment — don't trim it to preserve Pomodoro length
    const thisFocus = focusMinutes;
    segments.push({ position: position++, kind: "focus", durationMinutes: thisFocus });
    remaining -= thisFocus;
    focusCount += 1;

    if (remaining <= 0) break;

    const isLongBreakDue = focusCount % sessionsBeforeLongBreak === 0;
    const nextBreakLength = isLongBreakDue ? longBreakMinutes : breakMinutes;
    const kind: SegmentKind = isLongBreakDue ? "long_break" : "break";

    if (nextBreakLength <= 0) continue;

    // Lay down a full break segment
    const thisBreak = nextBreakLength;
    segments.push({ position: position++, kind, durationMinutes: thisBreak });
    remaining -= thisBreak;
  }

  return segments;
}

export interface TimelineEntry extends SegmentPlan {
  startsAt: Date;
  endsAt: Date;
}

/** Projects each segment onto a wall-clock timeline starting now (or a given start time). */
export function projectTimeline(segments: SegmentPlan[], startAt: Date = new Date()): TimelineEntry[] {
  let cursor = new Date(startAt);
  return segments.map((seg) => {
    const startsAt = new Date(cursor);
    const endsAt = new Date(cursor.getTime() + seg.durationMinutes * 60_000);
    cursor = endsAt;
    return { ...seg, startsAt, endsAt };
  });
}

export function totalFocusMinutes(segments: SegmentPlan[]): number {
  return segments.filter((s) => s.kind === "focus").reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function totalBreakMinutes(segments: SegmentPlan[]): number {
  return segments
    .filter((s) => s.kind !== "focus")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}
