"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  booking_ref: string;
  guest_name: string;
  email: string;
  phone: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  units: number;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_gateway: string;
  checkin_at: string;
  checkout_at: string;
  notes: string;
  created_at: string;
};

type Payment = {
  id: number; amount: number; currency: string; method: string;
  reference: string; notes: string; recorded_by: string; recorded_at: string;
};

const fmtDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const fmtTime = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const StatusBadge = ({ status, kind = "booking" }: { status: string; kind?: "booking" | "payment" }) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    confirmed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "checked-in": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "checked-out": "bg-white/10 text-white/60 border-white/20",
    cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    partial: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    failed: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  const cls = map[status] || "bg-white/10 text-white/60 border-white/20";
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-medium ${cls}`}>{status}</span>;
};

export default function ConfirmClient() {
  const [ref, setRef] = useState("");
  const [inputRef, setInputRef] = useState("");
  const [data, setData] = useState<{ booking: Status; payments: Payment[]; invoice: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("ref");
    if (r) {
      setRef(r);
      setInputRef(r);
      fetchStatus(r);
    }
  }, []);

  const fetchStatus = async (bookingRef: string) => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/bookings/status?ref=${encodeURIComponent(bookingRef)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body.error || "Booking not found");
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0D0C] text-white">
      <div className="mx-auto max-w-2xl px-6 pt-20 pb-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A86B]/50 text-[#C8A86B]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="mt-6 text-3xl font-light" style={{ fontFamily: "var(--font-display)" }}>Booking Status</h1>
          <p className="mt-3 text-white/70">Look up your reservation</p>
        </div>

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          <input
            value={inputRef}
            onChange={(e) => setInputRef(e.target.value)}
            placeholder="HBC-20260604-123"
            className="flex-1 bg-transparent px-4 py-2 text-sm font-mono outline-none"
            onKeyDown={(e) => { if (e.key === "Enter" && inputRef.trim()) { setRef(inputRef.trim()); fetchStatus(inputRef.trim()); } }}
          />
          <button
            disabled={!inputRef.trim() || loading}
            onClick={() => { setRef(inputRef.trim()); fetchStatus(inputRef.trim()); }}
            className="rounded-xl bg-white px-5 py-2 text-[11px] uppercase tracking-wider text-black disabled:opacity-40"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loading ? "Looking up..." : "Look up"}
          </button>
        </div>

        {err && <p className="mt-4 text-sm text-rose-300 text-center">{err}</p>}

        {data && (
          <div className="mt-10 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Reference</div>
                  <div className="mt-1 font-mono text-[#C8A86B]">{data.booking.booking_ref}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={data.booking.status} kind="booking" />
                  <StatusBadge status={data.booking.payment_status || "pending"} kind="payment" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guest</span><p className="mt-1">{data.booking.guest_name}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Room</span><p className="mt-1">{data.booking.room_name || "—"} × {data.booking.units}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Check-in</span><p className="mt-1">{fmtDate(data.booking.check_in)}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Check-out</span><p className="mt-1">{fmtDate(data.booking.check_out)}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Nights</span><p className="mt-1">{data.booking.nights}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guests</span><p className="mt-1">{data.booking.adults} adult{data.booking.adults !== 1 ? "s" : ""}{data.booking.children ? `, ${data.booking.children} child${data.booking.children !== 1 ? "ren" : ""}` : ""}</p></div>
              </div>

              {data.booking.checkin_at && (
                <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-blue-200/80">
                  Checked in: {fmtTime(data.booking.checkin_at)}
                </div>
              )}
              {data.booking.checkout_at && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] text-white/60">
                  Checked out: {fmtTime(data.booking.checkout_at)}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-[11px] uppercase tracking-[0.35em] text-white/50">Payment</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Total</span>
                  <span className="text-white/90">₹{data.booking.amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Paid</span>
                  <span className="text-emerald-300">₹{data.booking.amount_paid?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-white/80">Balance</span>
                  <span className={data.booking.amount - data.booking.amount_paid > 0 ? "text-amber-300" : "text-white/40"}>
                    ₹{(data.booking.amount - data.booking.amount_paid).toLocaleString()}
                  </span>
                </div>
                {data.booking.payment_gateway && (
                  <div className="flex items-center justify-between text-[11px] text-white/40">
                    <span>Method</span><span className="capitalize">{data.booking.payment_gateway}</span>
                  </div>
                )}
              </div>

              {data.payments && data.payments.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Payment history</div>
                  <ul className="mt-2 space-y-2 text-[11px]">
                    {data.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-white/60">
                        <span>₹{p.amount.toLocaleString()} · <span className="capitalize">{p.method}</span>{p.reference ? ` · ${p.reference}` : ""}</span>
                        <span className="text-white/30">{fmtTime(p.recorded_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.invoice && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] text-white/60">
                  Invoice <span className="font-mono text-[#C8A86B]">{data.invoice.invoice_no}</span> · {data.invoice.status}
                </div>
              )}
            </div>

            {data.booking.notes && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-[11px] uppercase tracking-[0.35em] text-white/50">Notes</h2>
                <p className="mt-2 text-sm text-white/70">{data.booking.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="inline-block rounded-full bg-white px-8 py-3 text-[11px] uppercase tracking-[0.4em] text-black" style={{ fontFamily: "var(--font-display)" }}>Back to home</Link>
        </div>
      </div>
    </main>
  );
}
