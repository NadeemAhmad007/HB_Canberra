"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConfirmClient() {
  const params = useSearchParams();
  const ref = params.get("ref");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0D0C] text-white p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A86B]/50 text-[#C8A86B]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="mt-6 text-3xl font-light" style={{ fontFamily: "var(--font-display)" }}>Booking Received</h1>
        <p className="mt-3 text-white/70">Your booking request is pending. Please complete the bank transfer using the details sent to your email to confirm your stay.</p>
        {ref && <p className="mt-2 font-mono text-[#C8A86B] text-sm">Ref: {ref}</p>}
        <Link href="/" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-[11px] uppercase tracking-[0.4em] text-black" style={{ fontFamily: "var(--font-display)" }}>Back to home</Link>
      </div>
    </main>
  );
}
