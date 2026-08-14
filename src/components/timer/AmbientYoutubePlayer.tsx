import { useEffect, useRef } from "react";
import { useAmbientPlayerStore } from "@/store/useAmbientPlayerStore";
import { parseYoutubeInput } from "@/lib/youtube";
import type { SegmentKind } from "@/types";

interface AmbientYoutubePlayerProps {
  url: string | null;
  volume: number;
  kind: SegmentKind | null;
}

/**
 * Lifecycle-only component: mounts/tears down the hidden YouTube IFrame player
 * via useAmbientPlayerStore. Visible controls live in AmbientPlayerControls,
 * which reads the same store — kept separate so the actual player instance
 * doesn't need to live inside a component that unmounts/remounts with the UI.
 */
export function AmbientYoutubePlayer({ url, volume, kind }: AmbientYoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mount = useAmbientPlayerStore((s) => s.mount);
  const destroy = useAmbientPlayerStore((s) => s.destroy);
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
