"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { formatPrice } from "@/lib/math";
import Link from "next/link";

const GST_RATE = 0.12;

const scenes = [
  { id: "deluxe", name: "Deluxe Room", image: "/panoramas/deluxe/thumb.jpg" },
  { id: "family", name: "Family Suite", image: "/panoramas/family/thumb.jpg" },
];

export default function BookingPage() {
  const pms = useStore((s) => s.pms);
  const pmsLoading = useStore((s) => s.pmsLoading);
  const fetchPms = useStore((s) => s.fetchPms);

  const pmsRooms = useMemo(() => pms?.rooms ?? [], [pms]);
  const pmsMeals = useMemo(() => pms?.mealPlans ?? [], [pms]);

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [units, setUnits] = useState(1);
  const [roomId, setRoomId] = useState("");
  const [mealCode, setMealCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchPms(); }, [fetchPms]);

  useEffect(() => {
    if (!roomId && pmsRooms.length > 0) setRoomId(String(pmsRooms[0].id));
  }, [pmsRooms, roomId]);

  useEffect(() => {
    if (checkIn && checkOut) fetchPms(checkIn, checkOut);
  }, [checkIn, checkOut, fetchPms]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    return Math.max(1, Math.round((+b - +a) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const selectedRoom = pmsRooms.find((r) => String(r.id) === roomId);
  const selectedMeal = pmsMeals.find((m) => m.code === mealCode);
  const roomPrice = selectedRoom?.currentPrice ?? 0;
  const mealPrice = selectedMeal?.price ?? 0;
  const roomTotal = roomPrice * units * nights;
  const mealTotal = (mealPrice * adults + Math.round(mealPrice * 0.5) * children) * units * nights;
  const subtotal = roomTotal + mealTotal;
  const taxes = Math.round(subtotal * GST_RATE);
  const total = subtotal + taxes;
  const maxUnits = selectedRoom?.availableUnits ?? selectedRoom?.units ?? 1;

  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (units > (selectedRoom.availableUnits ?? selectedRoom.units)) {
      setError("Not enough units available for selected dates");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/pms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, phone, email, roomId, mealCode, adults, children, units, checkIn, checkOut, nights, amount: total }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0D0C] text-white p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/50 text-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="mt-6 text-3xl font-light" style={{ fontFamily: "var(--font-display)" }}>Request received</h1>
          <p className="mt-3 text-white/70">We&apos;ll confirm your stay at Houseboat Canberra within the hour.</p>
          <Link href="/" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-[11px] uppercase tracking-[0.4em] text-black" style={{ fontFamily: "var(--font-display)" }}>Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0D0C] text-white">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#0A0D0C]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xs uppercase tracking-[0.4em] text-white/70 hover:text-white" style={{ fontFamily: "var(--font-display)" }}>
            Houseboat Canberra
          </Link>
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#C8A86B]" style={{ fontFamily: "var(--font-display)" }}>
            Reserve
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="mb-12">
          <h1 className="text-4xl font-light md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>Book your stay</h1>
          <p className="mt-3 text-white/60 max-w-xl">Direct reservation on Dal Lake. No fees, real-time availability.</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            {pmsLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-white/50">Loading rates...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Your name">
                    <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" required className="booking-input" />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required className="booking-input" />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="booking-input" />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Check-in">
                    <input type="date" value={checkIn} min={minDate} onChange={(e) => setCheckIn(e.target.value)} className="booking-input" />
                  </Field>
                  <Field label="Check-out">
                    <input type="date" value={checkOut} min={checkIn || minDate} onChange={(e) => setCheckOut(e.target.value)} className="booking-input" />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Adults">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="text-sm">{adults}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">−</button>
                        <button type="button" onClick={() => setAdults(Math.min(selectedRoom?.maxAdults ?? 4, adults + 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">+</button>
                      </div>
                    </div>
                  </Field>
                  <Field label="Children">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="text-sm">{children}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">−</button>
                        <button type="button" onClick={() => setChildren(Math.min(selectedRoom?.maxChildren ?? 2, children + 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">+</button>
                      </div>
                    </div>
                  </Field>
                  <Field label="Units">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="text-sm">{units} / {maxUnits}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setUnits(Math.max(1, units - 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">−</button>
                        <button type="button" onClick={() => setUnits(Math.min(maxUnits, units + 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">+</button>
                      </div>
                    </div>
                  </Field>
                </div>

                <Field label="Suite">
                  <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setUnits(1); }} className="booking-input">
                    {pmsRooms.map((r) => {
                      const avail = r.availableUnits ?? r.units;
                      return (
                        <option key={r.id} value={r.id} className="bg-[#0A0D0C]" disabled={avail === 0}>
                          {r.name} — {formatPrice(r.currentPrice, "INR")}/night {avail > 0 ? `(${avail} left)` : "(sold out)"}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field label="Meal plan">
                  <select value={mealCode} onChange={(e) => setMealCode(e.target.value)} className="booking-input">
                    <option value="" className="bg-[#0A0D0C]">No meal plan</option>
                    {pmsMeals.map((m) => (
                      <option key={m.code} value={m.code} className="bg-[#0A0D0C]">
                        {m.name} {m.price > 0 ? `+ ${formatPrice(m.price, "INR")}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                {error && <p className="text-sm text-rose-300">{error}</p>}

                <button type="submit" disabled={submitting} className="group relative w-full overflow-hidden rounded-full bg-white py-4 text-[11px] uppercase tracking-[0.4em] text-black disabled:opacity-50" style={{ fontFamily: "var(--font-display)" }}>
                  <span className="relative z-10 transition-colors group-hover:text-white">{submitting ? "Submitting..." : "Confirm Reservation"}</span>
                  <span className="absolute inset-0 -translate-x-full bg-[#C8A86B] transition-transform duration-500 group-hover:translate-x-0" />
                </button>
              </form>
            )}
          </div>

          <div className="lg:border-l lg:border-white/10 lg:pl-12">
            <div className="text-[10px] uppercase tracking-[0.45em] text-white/50" style={{ fontFamily: "var(--font-display)" }}>Summary</div>
            {selectedRoom && (
              <div className="mt-4">
                <h3 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>{selectedRoom.name}</h3>
                <div className="mt-4 space-y-1 text-sm text-white/70">
                  <div>{formatPrice(roomPrice, "INR")} / unit / night</div>
                  <div className="text-[11px] text-white/50">Up to {selectedRoom.maxAdults} adults + {selectedRoom.maxChildren} children per unit</div>
                  {selectedRoom.childPolicy && <div className="text-[10px] text-white/40 italic">{selectedRoom.childPolicy}</div>}
                  {selectedMeal && <div>+ {selectedMeal.name} ({formatPrice(mealPrice, "INR")}/adult, half for children)</div>}
                </div>
              </div>
            )}
            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
              <Line label={`${units} × ${selectedRoom?.name ?? "Suite"} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={formatPrice(roomTotal, "INR")} />
              {mealPrice > 0 && <Line label={`Meal plan (${adults} adults + ${children} children)`} value={formatPrice(mealTotal, "INR")} />}
              <Line label="Taxes & service" value={formatPrice(taxes, "INR")} muted />
              <div className="mt-4 border-t border-white/10 pt-4">
                <Line label="Total" value={formatPrice(total, "INR")} large />
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-[11px] text-white/55">
              <div className="flex items-center gap-2 text-white/80">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" /></svg>
                Direct perks
              </div>
              <ul className="mt-2 space-y-1">
                <li>• Complimentary airport transfer (5+ nights)</li>
                <li>• Welcome kahwa in your suite</li>
                <li>• Complimentary shikara at sunset</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.35em] text-white/50" style={{ fontFamily: "var(--font-display)" }}>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Line({ label, value, muted, large }: { label: string; value: string; muted?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-white/45" : "text-white/80"}>{label}</span>
      <span className={large ? "text-2xl font-light text-white" : "text-white/85"} style={{ fontFamily: "var(--font-display)" }}>{value}</span>
    </div>
  );
}
