import { CheckCircle2, MoreHorizontal, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatMinutesAsHours, getCategoryColor, getCategoryGradient } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FocusBlock } from "@/types";

interface BlockCardProps {
  block: FocusBlock;
  onStart: (block: FocusBlock) => void;
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

export function BlockCard({ block, onStart, onEdit, onDelete, onRestart, isDragging }: BlockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const doneTasks = block.tasks.filter((t) => t.isDone).length;
  const progressPct = Math.min(100, (block.completedMinutes / Math.max(1, block.totalMinutes)) * 100);
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
      {/* Inner card — solid dark fill so gradient shows only as the border ring */}
      <div className="rounded-[calc(1.25rem-1.5px)] bg-[#1B1B29] backdrop-blur-xl overflow-hidden h-full">
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
                  className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-lg border border-glass-border bg-ink-raised shadow-glass"
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
                {formatMinutesAsHours(block.completedMinutes)} / {formatMinutesAsHours(block.totalMinutes)}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} />
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
            onClick={() => onStart(block)}
          >
            <Play className="h-3.5 w-3.5" />
            {block.status === "active" ? "Resume in timer" : block.status === "completed" ? "View" : "Start"}
          </Button>
        </CardContent>
      </div>
    </div>
  );
}
