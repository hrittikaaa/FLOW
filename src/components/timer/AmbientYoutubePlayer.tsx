import { useEffect, useRef } from "react";
import { useAmbientPlayerStore } from "@/store/useAmbientPlayerStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useTimerStore } from "@/store/useTimerStore";
import { parseYoutubeInput } from "@/lib/youtube";

/**
 * Lifecycle-only component: mounts/tears down the hidden YouTube IFrame player
 * via useAmbientPlayerStore. Visible controls live in AmbientPlayerControls,
 * which reads the same store — kept separate so the actual player instance
 * doesn't need to live inside a component that unmounts/remounts with the UI.
 *
 * Mounted once at the app root (like MiniTimerPortal) and reads the active
 * block directly from the stores, rather than taking props from TimerView —
 * that way ambient audio keeps playing even after navigating away from the
 * Timer view to Dashboard/Analytics, instead of dying with the unmount.
 */
export function AmbientYoutubePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mount = useAmbientPlayerStore((s) => s.mount);
  const destroy = useAmbientPlayerStore((s) => s.destroy);

  const { activeBlockId, isRunning } = useTimerStore();
  const block = useBlocksStore((s) => s.blocks.find((b) => b.id === activeBlockId));
  const currentSegment = block?.segments[block.currentSegmentIndex];
  const kind = isRunning ? currentSegment?.kind ?? null : null;
  const url = block?.ambientYoutubeUrl ?? null;
  const volume = block?.ambientVolume ?? 50;
  const shouldPlay = Boolean(url) && kind === "focus";

  useEffect(() => {
    if (!shouldPlay || !url || !containerRef.current) {
      destroy();
      return;
    }
    const parsed = parseYoutubeInput(url);
    if (!parsed) {
      destroy();
      return;
    }
    mount(containerRef.current, { videoId: parsed.videoId, playlistId: parsed.playlistId, volume });
    return () => destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay, url]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
    />
  );
}
