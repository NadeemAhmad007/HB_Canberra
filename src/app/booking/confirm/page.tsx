import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

function ConfirmFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0D0C] text-white p-8">
      <div className="max-w-md text-center text-white/60">Loading…</div>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <ConfirmClient />
    </Suspense>
  );
}
