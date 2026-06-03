"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

/**
 * Root error boundary. Rendered when a route segment throws (server or client).
 * Stays on-brand: same gradient panels, same voice, same CTA paths as the home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("[Houseboat Canberra] runtime error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        className="min-h-screen text-white antialiased"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, #1A2A5A 0%, #0A1F44 45%, #050A18 100%)",
        }}
      >
        <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <BrandMark size={120} alt="Houseboat Canberra" />
          <p
            className="mt-10 text-[10px] uppercase tracking-[0.5em] text-[#C8A86B]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Something broke the silence
          </p>
          <h1
            className="mt-4 text-4xl font-light md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A small misstep on the water.
          </h1>
          <p
            className="mt-4 max-w-md text-sm text-white/65"
            style={{ fontFamily: "var(--font-body)" }}
          >
            We&apos;ve been notified. The page can be reloaded, or you can return to the
            beginning of the journey.
          </p>
          {error.digest && (
            <p
              className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/30"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Reference · {error.digest}
            </p>
          )}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="rounded-full bg-white px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-black transition hover:bg-[#C8A86B]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded-full border border-white/30 px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Return Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
