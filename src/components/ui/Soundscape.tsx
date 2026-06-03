"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useRef } from "react";

/**
 * Optional ambient soundscape. Uses Web Audio API to mix a few quiet
 * oscillators approximating lake ambience. Toggleable from the nav.
 */
export function Soundscape() {
  const enabled = useStore((s) => s.soundEnabled);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ gain: GainNode; oscs: AudioScheduledSourceNode[] } | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Fade out and stop.
      if (nodesRef.current && ctxRef.current) {
        const { gain, oscs } = nodesRef.current;
        gain.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.6);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          nodesRef.current = null;
        }, 700);
      }
      return;
    }

    // Init audio context on first activation.
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);

    // A simple drone (B1 + E2) with slow LFO for water-like motion.
    const oscs: AudioScheduledSourceNode[] = [];
    const freqs = [58.27, 82.41, 110]; // B1, E2, A2
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      // LFO on gain for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08 + Math.random() * 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(master);
      osc.start();
      lfo.start();
      oscs.push(osc, lfo);
    }

    // Light noise (water lapping) via white noise buffer.
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 400;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.06;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();
    oscs.push(noise);

    nodesRef.current = { gain: master, oscs };

    return () => {
      try {
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
        }, 500);
      } catch {}
    };
  }, [enabled]);

  return null;
}
