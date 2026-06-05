"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";

/**
 * Floating amenity cards that appear contextually during scenes that
 * have amenities defined. Drift gently, stagger in.
 */
export function AmenityCards() {
  const hotel = useStore((s) => s.hotel);
  const sceneIndex = useStore((s) => s.currentIndex);
  const scene = hotel.scenes[sceneIndex];
  if (!scene || !scene.amenities || scene.amenities.length === 0) return null;

  const theme = scene.theme;
  const isDark = theme === "dark";

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[15%] z-20 flex justify-center px-6 md:top-auto md:bottom-32 md:justify-end md:pr-12">
      <div className="flex max-w-3xl flex-wrap items-end justify-center gap-3 md:justify-end">
        <AnimatePresence mode="popLayout">
          {scene.amenities.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.92 }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto group relative w-64 overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${
                isDark
                  ? "border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.07] hover:border-white/30"
                  : "border-black/10 bg-white/40 text-black hover:bg-white/60 hover:border-black/20"
              }`}
              style={{
                boxShadow: isDark
                  ? "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
                  : "0 30px 80px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    isDark ? "border-[#C8A86B]/50 bg-[#C8A86B]/10" : "border-[#C8A86B]/60 bg-[#C8A86B]/20"
                  }`}
                >
                  <AmenityIcon name={a.icon} />
                </div>
                <span
                  className={`text-[9px] uppercase tracking-[0.4em] ${
                    isDark ? "text-white/45" : "text-black/45"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  0{i + 1}
                </span>
              </div>
              <h4
                className="mt-4 text-lg font-light leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {a.title}
              </h4>
              <p
                className={`mt-1.5 text-[12px] leading-relaxed ${
                  isDark ? "text-white/70" : "text-black/65"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {a.description}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AmenityIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactElement> = {
    sun: <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2M12 8a4 4 0 100 8 4 4 0 000-8z" />,
    boat: <path d="M3 17l9-5 9 5M5 17l7-12 7 12M3 21h18" />,
    plate: <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0zM3 12h18" />,
    fish: <path d="M2 12s4-7 11-7 9 7 9 7-2 7-9 7S2 12 2 12zM16 12a1 1 0 100-2 1 1 0 000 2zM22 8l-3 4 3 4" />,
    tea: <path d="M4 8h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8zM16 10h2a2 2 0 010 4h-2M6 4l-1 2M10 4l-1 2" />,
    hand: <path d="M6 14V6a2 2 0 014 0v6M10 10V4a2 2 0 014 0v8M14 10V6a2 2 0 014 0v10c0 4-3 7-7 7s-7-3-7-7v-3" />,
    flame: <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z" />,
    leaf: <path d="M5 21c10 0 16-6 16-16C11 5 5 11 5 21zM5 21l8-8" />,
    wave: <path d="M2 12c2 0 2-2 5-2s3 2 5 2 2-2 5-2 3 2 5 2M2 18c2 0 2-2 5-2s3 2 5 2 2-2 5-2 3 2 5 2" />,
    mountain: <path d="M3 20l6-10 4 6 3-4 5 8H3zM9 8a2 2 0 100-4 2 2 0 000 4z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C8A86B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      {paths[name] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
