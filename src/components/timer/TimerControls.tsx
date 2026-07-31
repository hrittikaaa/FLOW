import { Pause, Play, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerControlsProps {
  isRunning: boolean;
  hasActiveBlock: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function TimerControls({
  isRunning,
  hasActiveBlock,
  onPlayPause,
  onSkip,
  onStop,
  disabled,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" onClick={onStop} disabled={!hasActiveBlock || disabled} title="Stop & reset">
        <Square className="h-4 w-4" />
      </Button>
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
      <Button variant="outline" size="icon" onClick={onSkip} disabled={!hasActiveBlock || disabled} title="Skip segment">
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
}
