"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * Cinematic fullscreen loader. Plays once on first mount while the
 * heaviest panorama textures stream in.
 */
export function CinematicLoader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 2600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setProgress(e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 400);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.1, ease: [0.65, 0, 0.35, 1] } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0D0C] text-white"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <BrandMark size={180} className="drop-shadow-[0_8px_30px_rgba(10,31,68,0.55)]" alt="Houseboat Canberra" />
            <div
              className="mt-6 text-[10px] uppercase tracking-[0.5em] text-white/70"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Houseboat Canberra
            </div>
            <div
              className="mt-2 text-[9px] uppercase tracking-[0.4em] text-white/40"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Dal Lake · Est. 1980
            </div>
          </motion.div>

          <div className="absolute bottom-12 w-56">
            <div className="h-px w-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-[#C8A86B]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div
              className="mt-3 text-center text-[9px] uppercase tracking-[0.4em] text-white/40"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {Math.round(progress * 100)}% — preparing the lake
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
