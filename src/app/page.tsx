"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStore } from "@/store/useStore";
import { lerp, clamp } from "@/lib/math";
import { PanoramaStage } from "@/components/viewer/PanoramaStage";
import { StorySection } from "@/components/sections/StorySection";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/ui/Hero";
import { SceneProgress } from "@/components/ui/SceneProgress";
import { AmenityCards } from "@/components/ui/AmenityCards";
import { RoomPanel } from "@/components/ui/RoomPanel";
import { BookingPanel } from "@/components/ui/BookingPanel";
import { CinematicLoader } from "@/components/ui/CinematicLoader";
import { Footer } from "@/components/ui/Footer";
import { Soundscape } from "@/components/ui/Soundscape";

gsap.registerPlugin(ScrollTrigger);

/**
 * Professional-cameraman yaw: one full 360° sweep every 75 seconds when
 * actively panning. The camera alternates between long, considered moves
 * and clean holds so the eye can rest — the hallmark of a real operator.
 */
const YAW_RATE = (Math.PI * 2) / 75;

/** Pause (seconds) after a new scene enters before the pan/hold cycle starts. */
const SCENE_SETTLE = 1.6;

/** How long the camera pans before taking a break (seconds). */
const PAN_DURATION = 8.5;

/** How long the camera holds its angle between pans (seconds). */
const HOLD_DURATION = 4.2;

/** Extra FOV degrees added at the midpoint of a scene transition. */
const TRANSITION_ZOOM = 36;

export default function Home() {
  const hotel = useStore((s) => s.hotel);
  const fetchPms = useStore((s) => s.fetchPms);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPms();
  }, [fetchPms]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSceneIndex = -1;

    // Camera state machine: "settle" (just entered a new scene) → "hold"
    // → "pan" → "hold" → "pan" → …  Tracks when the current phase began.
    type Phase = "settle" | "hold" | "pan";
    let phase: Phase = "settle";
    let phaseStart = performance.now();

    // Settle: lerp from where the camera WAS to the new scene's startYaw
    // over SCENE_SETTLE seconds (shortest angular path, ease-in-out).
    let settleFrom = 0;
    let settleTo = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const cur = useStore.getState();

      // Detect scene change → set up the settle phase.
      if (cur.currentIndex !== lastSceneIndex) {
        lastSceneIndex = cur.currentIndex;
        const startYaw = hotel.scenes[cur.currentIndex]?.camera.startYaw ?? 0;

        // Shortest angular path: wrap diff into [-π, π].
        let diff = startYaw - cur.yaw;
        diff = ((diff % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        settleFrom = cur.yaw;
        settleTo = cur.yaw + diff;

        phase = "settle";
        phaseStart = now;
      }

      const phaseT = (now - phaseStart) / 1000;

      // Phase transitions.
      if (phase === "settle" && phaseT >= SCENE_SETTLE) {
        phase = "hold";
        phaseStart = now;
      } else if (phase === "hold" && phaseT >= HOLD_DURATION) {
        phase = "pan";
        phaseStart = now;
      } else if (phase === "pan" && phaseT >= PAN_DURATION) {
        phase = "hold";
        phaseStart = now;
      }

      if (!cur.freeLook) {
        if (phase === "settle") {
          // Ease-in-out from settleFrom → settleTo.
          const t = clamp(phaseT / SCENE_SETTLE, 0, 1);
          const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
          useStore.setState({ yaw: settleFrom + (settleTo - settleFrom) * eased });
        } else if (phase === "pan") {
          // Apply rotation only during "pan", with a 1.0s ease-in at the
          // start of each sweep so the camera doesn't snap into motion.
          const ramp = clamp(phaseT / 1.0, 0, 1);
          useStore.setState({ yaw: cur.yaw + dt * YAW_RATE * ramp });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const scenes = hotel.scenes;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          const anchors = scenes.map((s) => s.scrollAnchor);
          let i = 0;
          for (; i < anchors.length - 1; i++) {
            if (p < anchors[i + 1]) break;
          }
          i = Math.max(0, Math.min(scenes.length - 1, i));

          const a = anchors[i];
          const b = anchors[Math.min(i + 1, anchors.length - 1)];
          const local = b > a ? clamp((p - a) / (b - a), 0, 1) : 1;

          // Bell-curve zoom, slightly stretched so the wide point lingers.
          const zoomCurve = Math.sin(Math.pow(local, 0.85) * Math.PI);
          const zoom = TRANSITION_ZOOM * zoomCurve;
          const fov =
            lerp(scenes[i].camera.fov, scenes[Math.min(i + 1, scenes.length - 1)].camera.fov, local) +
            zoom;

          useStore.setState({
            currentIndex: i,
            transitionProgress: local,
            effectiveFov: fov,
            scrollProgress: p,
          });
        },
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [hotel]);

  return (
    <main ref={containerRef} className="relative min-h-screen bg-black text-white">
      <CinematicLoader />
      <PanoramaStage />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <Navigation />
      <Hero />
      <SceneProgress />
      <AmenityCards />
      <RoomPanel />
      <BookingPanel />
      <Soundscape />
      <div className="relative z-20">
        {hotel.scenes.map((scene, i) => (
          <StorySection key={scene.id} scene={scene} index={i} total={hotel.scenes.length} />
        ))}
        <div className="h-[40vh]" />
      </div>
      <Footer />
    </main>
  );
}
