import { create } from "zustand";
import { loadYoutubeIframeApi } from "@/lib/loadYoutubeIframeApi";
import type { YTPlayer } from "@/lib/youtubeIframeTypes";

export type AmbientPlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

interface MountOptions {
  videoId?: string;
  playlistId?: string;
  volume: number;
}

interface AmbientPlayerState {
  player: YTPlayer | null;
  status: AmbientPlayerStatus;
  errorMessage: string | null;
  title: string;
  duration: number;
  currentTime: number;
  volume: number;
  muted: boolean;
  hasPlaylist: boolean;

  mount: (container: HTMLElement, options: MountOptions) => Promise<void>;
  destroy: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;
let autoplayCheckTimeout: ReturnType<typeof setTimeout> | null = null;
let mountToken = 0;

function clearTimers() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (autoplayCheckTimeout) {
    clearTimeout(autoplayCheckTimeout);
    autoplayCheckTimeout = null;
  }
}

/** Maps YouTube's onError codes to a human-readable explanation. */
function errorMessageForCode(code: number): string {
  switch (code) {
    case 2:
      return "That link doesn't look like a valid YouTube video or playlist.";
    case 5:
      return "This video can't be played in an embedded player.";
    case 100:
      return "This video was removed or is private.";
    case 101:
    case 150:
      return "The owner of this video has disabled it from playing outside YouTube.";
    default:
      return "Something went wrong playing this link.";
  }
}

export const useAmbientPlayerStore = create<AmbientPlayerState>((set, get) => ({
  player: null,
  status: "idle",
  errorMessage: null,
  title: "",
  duration: 0,
  currentTime: 0,
  volume: 50,
  muted: false,
  hasPlaylist: false,

  mount: async (container, { videoId, playlistId, volume }) => {
    get().destroy();
    const token = ++mountToken;
    set({ status: "loading", errorMessage: null, volume, hasPlaylist: Boolean(playlistId) });

    const YT = await loadYoutubeIframeApi();
    if (token !== mountToken) return; // a newer mount (or unmount) happened while we were loading

    const player = new YT.Player(container, {
      height: "1",
      width: "1",
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        ...(playlistId
          ? { listType: "playlist", list: playlistId }
          : videoId
          ? { loop: 1, playlist: videoId }
          : {}),
      },
      events: {
        onReady: (e) => {
          if (token !== mountToken) return;
          e.target.setVolume(volume);
          if (playlistId) e.target.setLoop(true);
          e.target.playVideo();

          // Autoplay-with-sound safety net: if playback hasn't actually started
          // shortly after requesting it, leave status as "paused" so the UI can
          // offer a one-tap "enable audio" affordance instead of looking broken.
          autoplayCheckTimeout = setTimeout(() => {
            if (token !== mountToken) return;
            const YTns = window.YT!;
            if (e.target.getPlayerState() !== YTns.PlayerState.PLAYING) {
              set({ status: "paused" });
            }
          }, 1500);
        },
        onStateChange: (e) => {
          if (token !== mountToken) return;
          const YTns = window.YT!;
          if (e.data === YTns.PlayerState.PLAYING) {
            set({
              status: "playing",
              title: e.target.getVideoData()?.title ?? "",
              duration: e.target.getDuration(),
            });
            if (!pollInterval) {
              pollInterval = setInterval(() => {
                const p = get().player;
                if (!p) return;
                set({ currentTime: p.getCurrentTime(), duration: p.getDuration() });
              }, 500);
            }
          } else if (e.data === YTns.PlayerState.PAUSED) {
            set({ status: "paused" });
          } else if (e.data === YTns.PlayerState.CUED) {
            set({ title: e.target.getVideoData()?.title ?? "" });
          }
        },
        onError: (e) => {
          if (token !== mountToken) return;
          set({ status: "error", errorMessage: errorMessageForCode(e.data) });
        },
      },
    });

    if (token === mountToken) set({ player });
  },

  destroy: () => {
    mountToken++; // invalidate any in-flight mount/callbacks
    clearTimers();
    const { player } = get();
    player?.destroy();
    set({
      player: null,
      status: "idle",
      errorMessage: null,
      title: "",
      duration: 0,
      currentTime: 0,
      muted: false,
      hasPlaylist: false,
    });
  },

  play: () => get().player?.playVideo(),
  pause: () => get().player?.pauseVideo(),
  toggle: () => {
    const { player, status } = get();
    if (!player) return;
    status === "playing" ? player.pauseVideo() : player.playVideo();
  },
  seekTo: (seconds) => {
    get().player?.seekTo(seconds, true);
    set({ currentTime: seconds });
  },
  next: () => get().player?.nextVideo(),
  previous: () => get().player?.previousVideo(),
  setVolume: (v) => {
    get().player?.setVolume(v);
    set({ volume: v, muted: false });
  },
  toggleMute: () => {
    const { player, muted } = get();
    if (!player) return;
    if (muted) {
      player.unMute();
    } else {
      player.mute();
    }
    set({ muted: !muted });
  },
}));
