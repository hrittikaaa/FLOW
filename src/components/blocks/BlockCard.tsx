import { CheckCircle2, MoreHorizontal, Pencil, Play, RotateCcw, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMinutesAsHours, getCategoryColor, getCategoryGradient } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FocusBlock } from "@/types";

// Matches the exact hex values used in BlockRing + TimelineStrip
const FOCUS_COLOR = "#F2A65A";
const REST_COLOR = "#6FD6C6";
const segColor = (kind: string) => (kind === "focus" ? FOCUS_COLOR : REST_COLOR);
const segColorDim = (kind: string) => (kind === "focus" ? "rgba(242,166,90,0.18)" : "rgba(111,214,198,0.18)");

interface BlockCardProps {
  block: FocusBlock;
  onStart: (block: FocusBlock) => void;
  onResume: (block: FocusBlock) => void;
  onEdit: (block: FocusBlock) => void;
  onDelete: (block: FocusBlock) => void;
  onRestart: (block: FocusBlock) => void;
  isDragging?: boolean;
}

const statusStyles: Record<FocusBlock["status"], string> = {
  planned: "bg-white/10 text-paper/70",
  active: "bg-focus/20 text-focus",
  paused: "bg-rest/20 text-rest",
  completed: "bg-white/10 text-muted",
  archived: "bg-white/5 text-muted",
};

export function BlockCard({ block, onStart, onResume, onEdit, onDelete, onRestart, isDragging }: BlockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const doneTasks = block.tasks.filter((t) => t.isDone).length;

  // Include progress within the current (possibly still-running) segment so the
  // bar keeps advancing live even while this card is off-screen on another tab —
  // block.elapsedSecondsInSegment is ticked every second by the timer store
  // regardless of which view is mounted.
  const currentSegment = block.segments[block.currentSegmentIndex];
  const liveCompletedMinutes = block.completedMinutes + block.elapsedSecondsInSegment / 60;
  const progressPct = Math.min(100, (liveCompletedMinutes / Math.max(1, block.totalMinutes)) * 100);
  const totalSegmentMinutes = block.segments.reduce((s, seg) => s + seg.durationMinutes, 0) || 1;
  const isLocked = block.strictMode && block.status === "active";
  const categoryColor = getCategoryColor(block.category);
  const categoryGradient = getCategoryGradient(block.category);

  return (
    // Gradient border wrapper: gradient is the background, inner div clips it to just a border ring
    <div
      className={cn(
        "rounded-xl2 p-[1.5px] transition-all duration-300",
        isDragging && "scale-[1.02]"
      )}
      style={{
        background: categoryGradient,
        boxShadow: isDragging
          ? `0 0 28px -4px ${categoryColor}99, 0 8px 32px rgba(0,0,0,0.45)`
          : `0 0 14px -6px ${categoryColor}55, 0 4px 16px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Inner card — translucent glass fill so the gradient ring glows through, clipped so the gradient shows only as the border */}
      <div className="rounded-[calc(1.25rem-1.5px)] bg-ink-raised/70 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className={cn(
                  "mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  statusStyles[block.status]
                )}
              >
                {block.status}
              </span>
              <h3 className="truncate font-display text-base font-medium text-paper">{block.name}</h3>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: categoryColor }}
                />
                {block.category}
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-paper"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  className="glass-panel-strong absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-lg"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    disabled={isLocked}
                    onClick={() => {
                      onEdit(block);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-paper/90 hover:bg-white/5 disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    disabled={isLocked}
                    onClick={() => {
                      onRestart(block);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rest hover:bg-white/5 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restart
                  </button>
                  <button
                    disabled={isLocked}
                    onClick={() => {
                      onDelete(block);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-white/5 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {formatMinutesAsHours(Math.floor(liveCompletedMinutes))} / {formatMinutesAsHours(block.totalMinutes)}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            {/* Segmented progress bar — mirrors TimelineStrip colors & proportions */}
            <div className="flex h-2 w-full overflow-hidden rounded-full gap-[2px]">
              {block.segments.map((seg, i) => {
                const isPast = i < block.currentSegmentIndex || seg.isCompleted;
                const isCurrent = i === block.currentSegmentIndex && !seg.isCompleted;
                const fraction = isCurrent
                  ? Math.min(1, block.elapsedSecondsInSegment / (seg.durationMinutes * 60))
                  : 0;
                const widthPct = (seg.durationMinutes / totalSegmentMinutes) * 100;

                return (
                  <div
                    key={seg.id}
                    className="relative overflow-hidden rounded-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${widthPct}%`, flexShrink: 0, backgroundColor: segColorDim(seg.kind) }}
                  >
                    {/* Completed: full bright fill */}
                    {isPast && (
                      <div className="absolute inset-0" style={{ backgroundColor: segColor(seg.kind) }} />
                    )}
                    {/* Current: live partial fill with glow */}
                    {isCurrent && fraction > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-1000 ease-linear"
                        style={{
                          width: `${fraction * 100}%`,
                          backgroundColor: segColor(seg.kind),
                          boxShadow: `0 0 6px 1px ${segColor(seg.kind)}99`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {block.tasks.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {doneTasks}/{block.tasks.length} goals done
              </span>
            </div>
          )}

          <Button
            variant={block.status === "active" ? "primary" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => block.status === "paused" ? onResume(block) : onStart(block)}
          >
            {block.status === "active" ? <Timer className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {block.status === "active"
              ? "Open timer"
              : block.status === "paused"
              ? "Resume"
              : block.status === "completed"
              ? "View"
              : "Start"}
          </Button>
        </CardContent>
      </div>
    </div>
  );
}
