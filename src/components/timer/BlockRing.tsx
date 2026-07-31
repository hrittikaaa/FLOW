import { useMemo } from "react";
import type { BlockSegment } from "@/types";

interface BlockRingProps {
  segments: BlockSegment[];
  currentIndex: number;
  elapsedSeconds: number;
  size?: number;
}

const GAP_DEG = 2.2;
const STROKE = 14;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const clampedEnd = Math.max(endAngle, startAngle + 0.001);
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const colorFor = (kind: BlockSegment["kind"], dim = false) => {
  if (kind === "focus") return dim ? "rgba(242,166,90,0.18)" : "#F2A65A";
  return dim ? "rgba(111,214,198,0.18)" : "#6FD6C6";
};

export function BlockRing({ segments, currentIndex, elapsedSeconds, size = 340 }: BlockRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - STROKE * 1.5;

  const arcs = useMemo(() => {
    const totalMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0) || 1;
    const totalGap = GAP_DEG * segments.length;
    const degPerMinute = (360 - totalGap) / totalMinutes;

    let cursor = 0;
    return segments.map((seg, i) => {
      const sweep = seg.durationMinutes * degPerMinute;
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + GAP_DEG;
      return { seg, index: i, startAngle, endAngle };
    });
  }, [segments]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-0">
      {arcs.map(({ seg, index, startAngle, endAngle }) => {
        const isPast = index < currentIndex || seg.isCompleted;
        const isCurrent = index === currentIndex;
        const fraction = isCurrent ? Math.min(1, elapsedSeconds / (seg.durationMinutes * 60)) : 0;
        const currentEnd = startAngle + (endAngle - startAngle) * fraction;

        return (
          <g key={seg.id}>
            {/* base track for this segment */}
            <path
              d={describeArc(cx, cy, r, startAngle, endAngle)}
              stroke={isPast ? colorFor(seg.kind) : colorFor(seg.kind, true)}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              opacity={isPast ? 0.9 : 1}
            />
            {/* live progress overlay for the active segment */}
            {isCurrent && fraction > 0 && (
              <path
                d={describeArc(cx, cy, r, startAngle, currentEnd)}
                stroke={colorFor(seg.kind)}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                style={{ filter: `drop-shadow(0 0 6px ${colorFor(seg.kind)})` }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
