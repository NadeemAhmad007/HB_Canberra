"use client";

import { useStore } from "@/store/useStore";

/**
 * Scene progress rail — thin vertical line on the right with scene ticks.
 * Lets the user see where they are in the journey and click to jump.
 */
export function SceneProgress() {
  const hotel = useStore((s) => s.hotel);
  const currentIndex = useStore((s) => s.currentIndex);
  const transition = useStore((s) => s.transitionProgress);
  const jumpToScene = useStore((s) => s.jumpToScene);

  return (
    <div className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 md:block">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {hotel.scenes.map((s, i) => {
          const active = i === currentIndex;
          const next = i === currentIndex + 1;
          const op = active ? 1 : next ? 0.3 + Math.abs(transition) * 0.7 : 0.25;
          return (
            <button
              key={s.id}
              onClick={() => jumpToScene(s.id)}
              className="group flex items-center gap-3"
              aria-label={`Go to ${s.name}`}
            >
              <span
                className={`text-[9px] uppercase tracking-[0.35em] transition-all ${
                  active ? "text-white" : "text-white/40 group-hover:text-white/80"
                }`}
                style={{ fontFamily: "var(--font-display)", opacity: op }}
              >
                {s.name}
              </span>
              <span
                className={`relative block h-px transition-all duration-500 ${
                  active ? "w-12 bg-white" : "w-6 bg-white/30 group-hover:bg-white/60"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
