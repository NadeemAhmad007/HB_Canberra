"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { PanoramaSphere } from "./PanoramaSphere";
import { CameraRig } from "./CameraRig";
import { AmbientParticles } from "./AmbientParticles";
import { Preload } from "@react-three/drei";

/**
 * Hard cut between panoramas at the midpoint of the scroll transition.
 * A tiny smoothstep range (1%) prevents a hard pop on fast scrolls.
 */
function cutCurve(t: number, side: "out" | "in") {
  const x = Math.max(0, Math.min(1, (t - 0.5) / 0.01 + 0.5));
  const s = x * x * (3 - 2 * x);
  return side === "out" ? 1 - s : s;
}

/**
 * The full-screen WebGL stage. Renders two panorama spheres and HARD-CUTS
 * between them at the midpoint of the scroll transition — no ghosting of
 * the previous picture. The camera YAW auto-rotates over time (set in a
 * RAF loop in page.tsx) so the user sees the full 360° view of each
 * scene like a video.
 */
export function PanoramaStage() {
  const hotel = useStore((s) => s.hotel);
  const currentIndex = useStore((s) => s.currentIndex);
  const transition = useStore((s) => s.transitionProgress);
  const yaw = useStore((s) => s.yaw);
  const effectiveFov = useStore((s) => s.effectiveFov);
  const freeLook = useStore((s) => s.freeLook);

  const current = hotel.scenes[currentIndex];
  const next = hotel.scenes[Math.min(currentIndex + 1, hotel.scenes.length - 1)];
  const activeTheme = current.theme;

  const aOpacity = cutCurve(transition, "out");
  const bOpacity = cutCurve(transition, "in");

  // Camera state. The pitch is also hard-cut so the camera "snaps" to
  // the new scene's framing the moment the picture changes.
  const activePitch = bOpacity > aOpacity ? next.camera.pitch : current.camera.pitch;
  const cam = {
    yaw,
    pitch: activePitch,
    fov: effectiveFov,
  };

  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
        }}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 0.1], fov: effectiveFov, near: 0.1, far: 2000 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <PanoramaSphere
            url={current.panorama}
            opacity={aOpacity}
            cameraState={cam}
          />
          {bOpacity > 0.001 && (
            <PanoramaSphere
              url={next.panorama}
              opacity={bOpacity}
              cameraState={cam}
            />
          )}

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.4} />
          <AmbientParticles theme={activeTheme} />

          <CameraRig freeLook={freeLook} />
          <Preload all />
        </Suspense>
      </Canvas>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
