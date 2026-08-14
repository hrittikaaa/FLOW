/** Looks up a YouTube video/playlist's real title via the public oEmbed endpoint
 *  (no API key, CORS-enabled) — used to suggest a default label when saving a link.
 *  Returns null on any failure so callers can fall back to manual entry. */
export async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}
