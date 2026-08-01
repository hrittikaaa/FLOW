import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerControlsProps {
  isRunning: boolean;
  hasActiveBlock: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  onStop: () => void;
  onRestartSegment: () => void;
  onRestartBlock: () => void;
  disabled?: boolean;
}

export function TimerControls({
  isRunning,
  hasActiveBlock,
  onPlayPause,
  onSkip,
  onStop,
  onRestartSegment,
  onRestartBlock,
  disabled,
}: TimerControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Single actions button — opens dropdown with Stop / Restart options */}
      <div className="relative" ref={menuRef}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={!hasActiveBlock || disabled}
          title="Actions"
          className={menuOpen ? "bg-white/10 text-paper" : ""}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-48 overflow-hidden rounded-xl border border-glass-border bg-ink-raised shadow-glass">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted border-b border-glass-border">
              Actions
            </div>

            {/* Restart segment */}
            <button
              onClick={() => { onRestartSegment(); setMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-rest" />
              <span>
                <span className="block text-sm font-medium text-paper/90">Restart segment</span>
                <span className="block text-[10px] text-muted">Redo this segment only</span>
              </span>
            </button>

            {/* Restart block */}
            <button
              onClick={() => { onRestartBlock(); setMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-t border-glass-border/40"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-focus" />
              <span>
                <span className="block text-sm font-medium text-paper/90">Restart block</span>
                <span className="block text-[10px] text-muted">Start entire block over</span>
              </span>
            </button>

            {/* Stop & reset */}
            <button
              onClick={() => { onStop(); setMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-t border-glass-border/40"
            >
              <Square className="h-3.5 w-3.5 shrink-0 text-danger" />
              <span>
                <span className="block text-sm font-medium text-danger">Stop & reset</span>
                <span className="block text-[10px] text-muted">Stop timer, keep progress</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Play / Pause — stays as the large central button */}
      <Button
        variant="primary"
        size="lg"
        className="h-16 w-16 rounded-full"
        onClick={onPlayPause}
        disabled={!hasActiveBlock || disabled}
        title={isRunning ? "Pause" : "Start"}
      >
        {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
      </Button>

      {/* Skip */}
      <Button
        variant="outline"
        size="icon"
        onClick={onSkip}
        disabled={!hasActiveBlock || disabled}
        title="Skip segment"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
}
