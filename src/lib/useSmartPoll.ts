"use client";

import { useEffect, useRef } from "react";

const h = () => ({ Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}` });

/**
 * Polls /api/admin/ping (cheap single-query endpoint) at `intervalMs`.
 * Calls `onChange` only when the server-side timestamp advances.
 * Pauses when the tab is hidden; re-fetches immediately on focus.
 */
export function useSmartPoll(onChange: () => void, intervalMs: number = 15000, enabled: boolean = true) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const lastTs = useRef<string>("");
  const inflight = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: any = null;

    const ping = async () => {
      if (stopped || inflight.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      inflight.current = true;
      try {
        const res = await fetch("/api/admin/ping", { headers: h(), cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const ts = json?.ts || "";
        if (ts && ts !== lastTs.current) {
          const firstRun = lastTs.current === "";
          lastTs.current = ts;
          if (!firstRun) cb.current();
        }
      } catch { /* network blip, retry next tick */ }
      finally { inflight.current = false; }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(ping, intervalMs);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    const onVis = () => { if (document.visibilityState === "visible") { ping(); start(); } else stop(); };
    const onFocus = () => ping();

    ping();
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => { stopped = true; stop(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onFocus); };
  }, [intervalMs, enabled]);
}
