"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * The hero title that appears before the scroll begins. Auto-fades when
 * the user starts scrolling. Centers the brand mark prominently.
 */
export function Hero() {
  const hotel = useStore((s) => s.hotel);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center text-center text-white transition-all duration-1000 ${
        hidden ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
      }`}
    >
      <BrandMark
        size={222}
        className="drop-shadow-[0_8px_40px_rgba(10,31,68,0.55)]"
        alt={hotel.name}
      />
      <div
        className="mt-8 text-[10px] uppercase tracking-[0.6em] text-white/70"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {hotel.location.city} · {hotel.location.country}
      </div>
      <h1
        className="mt-4 text-4xl font-light leading-[1.05] tracking-[0.18em] uppercase md:text-5xl lg:text-6xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {hotel.name}
      </h1>
      <p
        className="mt-5 max-w-md text-sm text-white/80 md:text-base"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {hotel.tagline}
      </p>
      <div
        className="pointer-events-auto mt-12 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.45em] text-white/60 animate-pulse"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Scroll to begin
        <span className="block h-8 w-px bg-white/40" />
      </div>
    </div>
  );
}
