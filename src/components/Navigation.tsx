"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

/** Top-of-page luxury navigation. Hides on scroll-down, reveals on scroll-up. */
export function Navigation() {
  const hotel = useStore((s) => s.hotel);
  const toggleBooking = useStore((s) => s.toggleBooking);
  const toggleSound = useStore((s) => s.toggleSound);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const freeLook = useStore((s) => s.freeLook);
  const toggleFreeLook = useStore((s) => s.toggleFreeLook);

  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > 80);
      setLastY(y);
      setSolid(y > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-700 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div
        className={`flex items-center justify-between px-6 py-5 md:px-12 transition-all duration-500 ${
          solid ? "backdrop-blur-md bg-black/30" : ""
        }`}
      >
        <a href="#scene-arrival" className="flex items-center gap-3 text-white">
          <BrandMark size={66} className="drop-shadow-[0_2px_12px_rgba(10,31,68,0.5)]" alt={hotel.name} />
          <div className="flex flex-col leading-tight">
            <span
              className="text-[15px] font-light tracking-[0.32em] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {hotel.name}
            </span>
            <span
              className="text-[10px] tracking-[0.3em] uppercase text-white/60"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {hotel.location.city}
            </span>
          </div>
        </a>

        <nav
          className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.3em] uppercase text-white/85"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <a href="#scene-deck" className="hover:text-white transition">Stay</a>
          <a href="#scene-dining" className="hover:text-white transition">Dine</a>
          <a href="#scene-spa" className="hover:text-white transition">Wellness</a>
          <a href="#scene-family" className="hover:text-white transition">Suites</a>
          <a href="#scene-garden" className="hover:text-white transition">Garden</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFreeLook}
            aria-label="Toggle free look"
            className={`hidden sm:flex h-9 items-center gap-1.5 rounded-full border px-3 text-[10px] uppercase tracking-[0.25em] transition ${
              freeLook
                ? "border-[#C8A86B] bg-[#C8A86B]/15 text-[#C8A86B]"
                : "border-white/25 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            <FreeLookIcon />
            {freeLook ? "Free Look" : "Cinematic"}
          </button>
          <button
            onClick={toggleSound}
            aria-label="Toggle ambient sound"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/80 hover:bg-white/10 transition"
          >
            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button
            onClick={() => toggleBooking()}
            className="group relative overflow-hidden rounded-full border border-white/30 px-5 py-2 text-[11px] tracking-[0.3em] uppercase text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="relative z-10 transition-colors duration-500 group-hover:text-black">Reserve</span>
            <span className="absolute inset-0 -translate-x-full bg-white transition-transform duration-500 group-hover:translate-x-0" />
          </button>
        </div>
      </div>
    </header>
  );
}

function FreeLookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M16 8a5 5 0 010 8" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M17 9l5 5M22 9l-5 5" />
    </svg>
  );
}
