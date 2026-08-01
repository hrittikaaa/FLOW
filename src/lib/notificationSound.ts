/**
 * Plays a brief, pleasant chime using the Web Audio API.
 * Works even in background tabs (no user gesture required after the first
 * interaction) and requires no external audio files.
 *
 * kind === "focus"      → warm two-tone chime (break time!)
 * kind === "break"      → brighter ascending chime (focus time!)
 * kind === "completed"  → triumphant three-note rise
 */

type ChimeKind = "focus" | "break" | "completed";

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gain: number
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);

  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(env);
  env.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

export function playChime(kind: ChimeKind = "focus"): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (kind === "completed") {
    // Triumphant three-note rise: C5 → E5 → G5
    playTone(ctx, 523.25, now,        0.6, 0.35);
    playTone(ctx, 659.25, now + 0.18, 0.6, 0.35);
    playTone(ctx, 783.99, now + 0.36, 0.9, 0.4);
  } else if (kind === "break") {
    // Bright ascending two-tone: E5 → A5 (break is done, back to work)
    playTone(ctx, 659.25, now,        0.5, 0.3);
    playTone(ctx, 880.00, now + 0.2,  0.7, 0.35);
  } else {
    // Warm descending two-tone: G5 → E5 (focus done, time to rest)
    playTone(ctx, 783.99, now,        0.5, 0.3);
    playTone(ctx, 659.25, now + 0.2,  0.7, 0.35);
  }
}
