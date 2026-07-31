import { useEffect, useRef } from "react";
import type { AmbientSound, SegmentKind } from "@/types";

interface AmbientSoundPlayerProps {
  sound: AmbientSound;
  kind: SegmentKind | null;
}

interface AudioGraph {
  ctx: AudioContext;
  source: AudioBufferSourceNode;
  gain: GainNode;
  lfo?: OscillatorNode;
}

function makeNoiseBuffer(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Builds a small filter chain per soundscape and returns the finished graph. */
function buildGraph(ctx: AudioContext, sound: AmbientSound): AudioGraph {
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx);
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  let node: AudioNode = source;

  if (sound === "rain") {
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 900;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 5200;
    node.connect(highpass);
    highpass.connect(lowpass);
    node = lowpass;
  } else if (sound === "lofi") {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 700;
    node.connect(lowpass);
    node = lowpass;
  }
  // 'white-noise' uses the raw source with no filtering.

  node.connect(gain);
  gain.connect(ctx.destination);

  let lfo: OscillatorNode | undefined;
  if (sound === "lofi") {
    // Gentle amplitude wobble so it doesn't sit perfectly static.
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  source.start();
  return { ctx, source, gain, lfo };
}

const TARGET_VOLUME = 0.14;
const FADE_SECONDS = 1.2;

export function AmbientSoundPlayer({ sound, kind }: AmbientSoundPlayerProps) {
  const graphRef = useRef<AudioGraph | null>(null);
  const shouldPlay = sound !== "none" && kind === "focus";

  useEffect(() => {
    if (!shouldPlay) return;

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const graph = buildGraph(ctx, sound);
    graphRef.current = graph;
    graph.gain.gain.linearRampToValueAtTime(TARGET_VOLUME, ctx.currentTime + FADE_SECONDS);

    return () => {
      const g = graphRef.current;
      if (!g) return;
      const now = g.ctx.currentTime;
      g.gain.gain.cancelScheduledValues(now);
      g.gain.gain.setValueAtTime(g.gain.gain.value, now);
      g.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      setTimeout(() => {
        g.source.stop();
        g.lfo?.stop();
        g.ctx.close();
      }, FADE_SECONDS * 1000 + 100);
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay, sound]);

  return null;
}
