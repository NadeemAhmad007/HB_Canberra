"use client";

import { useStore } from "@/store/useStore";
import { motion } from "framer-motion";
import type { Scene } from "@/types/hotel";

interface Props {
  scene: Scene;
  index: number;
  total: number;
}

/**
 * A full-viewport scrollable section. Acts as the scroll trigger anchor
 * for the cinematic camera. A subtle caption at the bottom of the screen
 * fades in based on how visible this scene's panorama is in the crossfade.
 */
export function StorySection({ scene, index, total }: Props) {
  const currentIndex = useStore((s) => s.currentIndex);
  const local = useStore((s) => s.transitionProgress);

  // Opacity mirrors the sphere opacity for this scene.
  // Sphere A (currentIndex) is at (1 - local); sphere B (currentIndex+1) is at local.
  let opacity = 0;
  if (index === currentIndex) opacity = 1 - local;
  else if (index === currentIndex + 1) opacity = local;

  return (
    <section
      id={`scene-${scene.id}`}
      data-scene-index={index}
      className="relative flex h-[100vh] w-full items-end justify-start"
      aria-label={scene.name}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.70) 100%)",
        }}
      />

      <motion.div
        animate={{ opacity, y: opacity > 0 ? 0 : 12 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-16 max-w-2xl px-6 pb-8 text-white md:mb-20 md:px-12"
      >
        <div
          className="mb-2 text-[10px] uppercase tracking-[0.5em] text-[#C8A86B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {scene.kicker} &nbsp;·&nbsp; {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <h2
          className="font-light leading-[1.1] tracking-tight text-[28px] sm:text-[36px] md:text-[48px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {scene.headline}
        </h2>
        <p
          className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/80 md:text-[15px]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {scene.body}
        </p>
      </motion.div>
    </section>
  );
}
