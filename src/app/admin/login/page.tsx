"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel } from "lucide-react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin?resource=bookings", {
      headers: { Authorization: `Bearer ${pw}` },
    });
    if (res.ok) {
      sessionStorage.setItem("admin_token", pw);
      router.push("/admin");
    } else {
      setErr("Invalid password");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0D0C] text-white">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Hotel className="h-6 w-6 text-[#C8A86B]" />
          </div>
          <h1 className="mt-6 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Houseboat Canberra</h1>
          <p className="mt-2 text-sm text-white/50">Property Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40">Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30"
              autoFocus
              required
            />
          </div>
          {err && <p className="text-sm text-rose-300">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-50"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
