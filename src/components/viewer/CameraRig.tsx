"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { lerp, clamp } from "@/lib/math";
import { useStore } from "@/store/useStore";

interface Props {
  /** When true, mouse/touch drag controls the camera (overrides auto-rotate). */
  freeLook: boolean;
  /** Damping factor (0..1). Higher = snappier. */
  damping?: number;
}

const PITCH_LIMIT: [number, number] = [-Math.PI / 2.2, Math.PI / 2.2];

/**
 * Manual camera control (used in Free Look mode). When activated, the user
 * can drag to look around. The store's auto-rotating yaw is paused while
 * free-look is engaged.
 */
export function CameraRig({ freeLook, damping = 0.10 }: Props) {
  const { gl, camera } = useThree();
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const offset = useRef({ yaw: 0, pitch: 0 });

  // Seed the offset from the store's current yaw/pitch when entering free-look.
  useEffect(() => {
    if (freeLook) {
      const { yaw, scrollProgress } = useStore.getState();
      // Find current scene's pitch.
      const scenes = useStore.getState().hotel.scenes;
      const anchors = scenes.map((s) => s.scrollAnchor);
      let i = 0;
      for (; i < anchors.length - 1; i++) {
        if (scrollProgress < anchors[i + 1]) break;
      }
      const scene = scenes[Math.max(0, Math.min(scenes.length - 1, i))];
      offset.current.yaw = yaw;
      offset.current.pitch = scene.camera.pitch;
    }
  }, [freeLook]);

  useEffect(() => {
    if (!freeLook) return;
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      offset.current.yaw += -dx * 0.0035;
      offset.current.pitch += dy * 0.0035;
      offset.current.pitch = clamp(offset.current.pitch, PITCH_LIMIT[0], PITCH_LIMIT[1]);
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [freeLook, gl]);

  useFrame(() => {
    if (!freeLook) return;
    const cam = camera as THREE.PerspectiveCamera;
    cam.rotation.order = "YXZ";
    cam.rotation.y = lerp(cam.rotation.y, offset.current.yaw, damping);
    cam.rotation.x = lerp(cam.rotation.x, offset.current.pitch, damping);
  });

  return null;
}
