export interface ParsedYoutubeInput {
  videoId?: string;
  playlistId?: string;
}

/**
 * Parses a YouTube (or YouTube Music) link into a video id and/or playlist id.
 * Accepts youtube.com/watch, youtu.be short links, youtube.com/playlist,
 * and music.youtube.com equivalents — they all share the same `v`/`list` params.
 * Returns null if the input isn't a recognizable YouTube link.
 */
export function parseYoutubeInput(input: string): ParsedYoutubeInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^music\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") return null;

  let videoId: string | undefined;
  let playlistId: string | undefined = url.searchParams.get("list") ?? undefined;

  if (host === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || undefined;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") ?? undefined;
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2];
  } else if (url.pathname === "/playlist") {
    // playlistId already captured above
  }

  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}
