import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you were looking for has drifted. Return to the lake.",
  robots: { index: false, follow: false },
};

/**
 * Premium 404. Same language as the rest of the site — "a quiet lake", "the path
 * ahead" — so the moment of getting lost still feels intentional.
 */
export default function NotFound() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-6 text-center text-white antialiased"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #1A2A5A 0%, #0A1F44 45%, #050A18 100%)",
      }}
    >
      <div className="max-w-2xl">
        <BrandMark size={120} alt="Houseboat Canberra" />
        <p
          className="mt-10 text-[10px] uppercase tracking-[0.5em] text-[#C8A86B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The page has drifted
        </p>
        <h1
          className="mt-4 text-7xl font-light leading-none md:text-8xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          404
        </h1>
        <p
          className="mt-6 text-lg font-light text-white/80"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The shikara took a different turn.
        </p>
        <p
          className="mt-3 max-w-md text-sm text-white/55"
          style={{ fontFamily: "var(--font-body)" }}
        >
          The page you&apos;re looking for is no longer moored here. Return to the
          beginning of the journey, or speak with the reservations desk.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-black transition hover:bg-[#C8A86B]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Return to the lake
          </Link>
          <a
            href="mailto:Houseboat.canberra@gmail.com"
            className="rounded-full border border-white/30 px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-white/10"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Speak to the desk
          </a>
        </div>
      </div>
    </main>
  );
}
