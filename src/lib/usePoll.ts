"use client";

import { useEffect, useRef } from "react";

export function usePoll(fn: () => void, intervalMs: number, enabled: boolean = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let id: any = null;

    const start = () => {
      if (id) return;
      id = setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          fnRef.current();
        }
      }, intervalMs);
    };
    const stop = () => {
      if (id) { clearInterval(id); id = null; }
    };

    const onVis = () => { if (document.visibilityState === "visible") start(); else stop(); };
    const onFocus = () => fnRef.current();

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => { stop(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onFocus); };
  }, [intervalMs, enabled]);
}
