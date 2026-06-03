"use client";

import { useRef, useState } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Hotspot as HotspotType } from "@/types/hotel";

interface Props {
  hotspot: HotspotType;
  onClick?: (h: HotspotType) => void;
}

/**
 * Clickable 3D hotspot anchored to a panorama. Renders as a glowing ring +
 * label that always faces the camera. Hover scales it up and brightens glow.
 */
export function Hotspot({ hotspot, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    // Subtle pulse.
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 1.6) * 0.08 + (hover ? 0.2 : 0);
    ref.current.scale.setScalar(s);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(hotspot);
  };

  return (
    <group
      ref={ref}
      position={hotspot.position.map((p) => p * 30) as [number, number, number]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      onClick={handleClick}
    >
      <Billboard>
        {/* Outer glow ring */}
        <mesh>
          <ringGeometry args={[0.7, 1.0, 32]} />
          <meshBasicMaterial
            color={hover ? "#F5D08C" : "#C8A86B"}
            transparent
            opacity={hover ? 0.85 : 0.55}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* Inner solid dot */}
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.18, 32]} />
          <meshBasicMaterial
            color={hover ? "#FFFFFF" : "#E9DFCE"}
            transparent
            opacity={0.95}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* Label */}
        <Html
          position={[0, -1.4, 0]}
          center
          distanceFactor={28}
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={`whitespace-nowrap rounded-full border border-white/30 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/90 transition-all duration-300 ${
              hover ? "bg-white/15 backdrop-blur-md" : "bg-black/30 backdrop-blur-sm"
            }`}
            style={{
              fontFamily: "var(--font-display, system-ui)",
              letterSpacing: "0.3em",
            }}
          >
            {hotspot.label}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}
