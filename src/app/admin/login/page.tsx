"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"password" | "email">("password");
  const [pw, setPw] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    const res = await fetch("/api/admin?resource=bookings", {
      headers: { Authorization: `Bearer ${pw}` },
    });
    if (res.ok) {
      sessionStorage.setItem("admin_token", pw);
      sessionStorage.setItem("admin_user", JSON.stringify({ name: "Admin", role: "owner" }));
      router.push("/admin");
    } else {
      setErr("Invalid password"); setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      sessionStorage.setItem("admin_token", data.token);
      sessionStorage.setItem("admin_user", JSON.stringify(data.user));
      router.push("/admin");
    } else {
      setErr(data.error || "Login failed"); setLoading(false);
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

        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          <button onClick={() => setMode("password")} className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider ${mode === "password" ? "bg-white/15 text-white" : "text-white/40"}`}>Password</button>
          <button onClick={() => setMode("email")} className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider ${mode === "email" ? "bg-white/15 text-white" : "text-white/40"}`}>Email</button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePassword} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Admin Password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30" autoFocus required />
            </div>
            {err && <p className="text-sm text-rose-300">{err}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-50" style={{ fontFamily: "var(--font-display)" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmail} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30" autoFocus required />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Password</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30" required />
            </div>
            {err && <p className="text-sm text-rose-300">{err}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-50" style={{ fontFamily: "var(--font-display)" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
