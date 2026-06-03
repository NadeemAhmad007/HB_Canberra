"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { lerp, clamp } from "@/lib/math";
import type { CameraState } from "@/types/hotel";

interface Props {
  url: string;
  /** 0..1 opacity. */
  opacity: number;
  /** Target camera transform this sphere reads from the store. */
  cameraState: CameraState;
}

/**
 * Inside-out equirectangular sphere. Smoothly damps toward the target
 * camera transform so the motion feels like a high-end camera rig (no
 * frame-step jitter, no abrupt snaps when the store updates).
 */
export function PanoramaSphere({ url, opacity, cameraState }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rawTexture = useTexture(url);
  const texture = useMemo(() => {
    const t = rawTexture.clone();
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  }, [rawTexture]);

  useFrame(({ camera }, dt) => {
    if (!meshRef.current) return;
    const cam = camera as THREE.PerspectiveCamera;
    cam.rotation.order = "YXZ";

    // Very high damping → motion lags the target slightly, smoothing out
    // any frame-to-frame deltas. Reads as a buttery professional rig.
    const k = 1 - Math.pow(0.00005, dt);
    cam.rotation.y = lerp(cam.rotation.y, cameraState.yaw, k);
    cam.rotation.x = lerp(cam.rotation.x, cameraState.pitch, k);
    cam.rotation.z = 0;

    if (Math.abs(cam.fov - cameraState.fov) > 0.005) {
      cam.fov = lerp(cam.fov, cameraState.fov, k);
      cam.updateProjectionMatrix();
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]} renderOrder={-1}>
      <sphereGeometry args={[1000, 60, 40]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={clamp(opacity, 0, 1)}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
