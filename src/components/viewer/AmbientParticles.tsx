"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

function initParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 12;
    const t = Math.random() * Math.PI * 2;
    const p = (Math.random() - 0.5) * Math.PI;
    positions[i * 3 + 0] = r * Math.cos(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.sin(p);
    positions[i * 3 + 2] = r * Math.cos(p) * Math.sin(t);
    phases[i] = Math.random() * Math.PI * 2;
  }
  return { positions, phases };
}

/**
 * Floating ambient particles for atmosphere. Subtle, slow, gold-warm.
 */
export function AmbientParticles({ count = 80, theme = "dark" }: { count?: number; theme?: "dark" | "light" }) {
  const ref = useRef<THREE.Points>(null);
  const [particleData] = useState(() => initParticles(count));
  const { positions, phases } = particleData;

  useEffect(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.color = new THREE.Color(theme === "dark" ? "#F5D08C" : "#C8A86B");
    mat.opacity = theme === "dark" ? 0.5 : 0.35;
  }, [theme]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      arr[i * 3 + 1] += Math.sin(t * 0.4 + phase) * 0.005;
      arr[i * 3 + 0] += Math.cos(t * 0.3 + phase) * 0.003;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
