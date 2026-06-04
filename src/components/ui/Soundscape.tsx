"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useRef } from "react";

export function Soundscape() {
  const enabled = useStore((s) => s.soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/chand_sifarish.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }

    if (enabled) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [enabled]);

  return null;
}
