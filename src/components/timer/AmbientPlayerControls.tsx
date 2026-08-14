import { useState } from "react";
import { AlertTriangle, Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useAmbientPlayerStore } from "@/store/useAmbientPlayerStore";
import { Slider } from "@/components/ui/slider";
import { formatClock } from "@/lib/utils";

/** Compact mini-player bar for the ambient YouTube audio — only meaningful while a block with
 *  an ambientYoutubeUrl is being shown; TimerView is responsible for gating that. */
export function AmbientPlayerControls() {
  const {
    status,
    errorMessage,
    title,
    duration,
    currentTime,
    volume,
    muted,
    hasPlaylist,
    play,
    toggle,
    seekTo,
    next,
    previous,
    setVolume,
    toggleMute,
  } = useAmbientPlayerStore();
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);

  if (status === "idle") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-white/[0.02] px-3 py-2 text-xs text-muted">
        <Music2 className="h-3.5 w-3.5 shrink-0" />
        <span>Ambient audio will play during focus segments</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-white/[0.02] px-3 py-2 text-xs text-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>Loading ambient audio…</span>
      </div>
    );
  }

  const isPlaying = status === "playing";
  const shownTime = scrubPreview ?? currentTime;
  const isAutoplayBlocked = status === "paused" && currentTime === 0;

  return (
    <div className="space-y-2 rounded-lg border border-glass-border bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <button
          onClick={previous}
          disabled={!hasPlaylist}
          title="Previous track"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-paper disabled:opacity-30 disabled:hover:text-muted"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => (isAutoplayBlocked ? play() : toggle())}
          title={isPlaying ? "Pause" : "Play"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-focus/90 text-ink hover:bg-focus"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-0.5" />}
        </button>
        <button
          onClick={next}
          disabled={!hasPlaylist}
          title="Next track"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-paper disabled:opacity-30 disabled:hover:text-muted"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <span className="min-w-0 flex-1 truncate text-xs text-paper/80">
          {isAutoplayBlocked ? "Tap play to enable ambient audio" : title || "Ambient audio"}
        </span>

        <button
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-muted transition-colors hover:text-paper"
        >
          {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[muted ? 0 : volume]}
          onValueChange={([v]) => setVolume(v)}
          className="w-20 shrink-0"
        />
      </div>

      {duration > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
            {formatClock(shownTime)}
          </span>
          <Slider
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={[shownTime]}
            onValueChange={([v]) => setScrubPreview(v)}
            onValueCommit={([v]) => {
              seekTo(v);
              setScrubPreview(null);
            }}
            className="flex-1"
          />
          <span className="w-9 shrink-0 font-mono text-[10px] tabular-nums text-muted">{formatClock(duration)}</span>
        </div>
      )}
    </div>
  );
}
