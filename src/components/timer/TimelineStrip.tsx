import { projectTimeline, totalBreakMinutes, totalFocusMinutes } from "@/lib/sessionCalculator";
import { formatMinutesAsHours, formatTimeOfDay } from "@/lib/utils";
import type { SegmentPlan } from "@/types";
import { cn } from "@/lib/utils";

interface TimelineStripProps {
  segments: SegmentPlan[];
  startAt?: Date;
  compact?: boolean;
}

export function TimelineStrip({ segments, startAt = new Date(), compact = false }: TimelineStripProps) {
  if (segments.length === 0) {
    return <p className="text-sm text-muted">Set a total time and ratio to generate a timeline.</p>;
  }

  const timeline = projectTimeline(segments, startAt);
  const finish = timeline[timeline.length - 1]?.endsAt;
  const focusMin = totalFocusMinutes(segments);
  const breakMin = totalBreakMinutes(segments);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted">
          <span className="text-focus font-medium">{formatMinutesAsHours(focusMin)}</span> focus ·{" "}
          <span className="text-rest font-medium">{formatMinutesAsHours(breakMin)}</span> break
        </span>
        {finish && (
          <span className="text-muted">
            Finish around <span className="font-medium text-paper">{formatTimeOfDay(finish)}</span>
          </span>
        )}
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {segments.map((s, i) => (
          <div
            key={i}
            className={cn(
              "h-full first:rounded-l-full last:rounded-r-full",
              s.kind === "focus" ? "bg-focus" : "bg-rest"
            )}
            style={{ width: `${(s.durationMinutes / segments.reduce((a, b) => a + b.durationMinutes, 0)) * 100}%` }}
            title={`${s.kind === "focus" ? "Focus" : s.kind === "long_break" ? "Long break" : "Break"} · ${s.durationMinutes}m`}
          />
        ))}
      </div>

      {!compact && (
        <ol className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
          {timeline.map((entry, i) => (
            <li key={i} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-white/[0.03]">
              <span className="flex items-center gap-2">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", entry.kind === "focus" ? "bg-focus" : "bg-rest")}
                />
                <span className="text-paper/80">
                  {entry.kind === "focus" ? "Focus" : entry.kind === "long_break" ? "Long break" : "Break"}
                </span>
                <span className="text-muted">{entry.durationMinutes}m</span>
              </span>
              <span className="font-mono text-muted">
                {formatTimeOfDay(entry.startsAt)} – {formatTimeOfDay(entry.endsAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
