"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useState, useMemo, useEffect } from "react";
import { formatPrice } from "@/lib/math";

const GST_RATE = 0.12;

export function BookingPanel() {
  const show = useStore((s) => s.showBooking);
  const toggle = useStore((s) => s.toggleBooking);
  const hotel = useStore((s) => s.hotel);
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
  const [roomId, setRoomId] = useState(pmsRooms[0]?.id ? String(pmsRooms[0].id) : "");
  const [mealCode, setMealCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show && !pms) fetchPms();
  }, [show, pms, fetchPms]);

  useEffect(() => {
    if (!roomId && pmsRooms.length > 0) setRoomId(String(pmsRooms[0].id));
  }, [pmsRooms, roomId]);

  // Refetch availability when dates change
  useEffect(() => {
    if (checkIn && checkOut && show) fetchPms(checkIn, checkOut);
  }, [checkIn, checkOut, show, fetchPms]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.round((+b - +a) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
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
      setError("Not enough units available for the selected dates");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        guestName,
        phone,
        email,
        roomId: roomId,
        mealCode: mealCode,
        adults,
        children,
        units,
        checkIn,
        checkOut,
        nights,
        amount: total,
      };

      const res = await fetch("/api/pms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggle(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 text-white"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,18,20,0.92) 0%, rgba(8,10,12,0.95) 100%)",
              boxShadow: "0 60px 140px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
              <div className="p-8 md:p-12">
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.45em] text-[#C8A86B]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Reserve your stay
                    </div>
                    <h2
                      className="mt-3 text-3xl font-light leading-tight md:text-4xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      A quiet lake. A considered room.
                    </h2>
                    <p
                      className="mt-2 max-w-md text-sm text-white/60"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Real-time availability, no fees, direct from the houseboat.
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(false)}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>

                {pmsLoading ? (
                  <div className="mt-20 flex items-center justify-center text-sm text-white/50">
                    Loading rates...
                  </div>
                ) : !submitted ? (
                  <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="Your name">
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Full name"
                          required
                          className="booking-input"
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          required
                          className="booking-input"
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="booking-input"
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Check-in">
                        <input
                          type="date"
                          value={checkIn}
                          min={minDate}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="booking-input"
                        />
                      </Field>
                      <Field label="Check-out">
                        <input
                          type="date"
                          value={checkOut}
                          min={checkIn || minDate}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="booking-input"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Adults">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                          <span className="text-sm" style={{ fontFamily: "var(--font-body)" }}>{adults}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">−</button>
                            <button type="button" onClick={() => setAdults(Math.min(selectedRoom?.maxAdults ?? 2, adults + 1))} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">+</button>
                          </div>
                        </div>
                      </Field>
                      <Field label="Children">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                          <span className="text-sm" style={{ fontFamily: "var(--font-body)" }}>{children}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">−</button>
                            <button type="button" onClick={() => setChildren(Math.min(selectedRoom?.maxChildren ?? 2, children + 1))} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">+</button>
                          </div>
                        </div>
                      </Field>
                      <Field label="Units">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                          <span className="text-sm" style={{ fontFamily: "var(--font-body)" }}>{units} / {maxUnits}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { const u = Math.max(1, units - 1); setUnits(u); setAdults(Math.min(selectedRoom?.maxAdults ?? 2, Math.round(adults / units * u || 1))); setChildren(Math.min(selectedRoom?.maxChildren ?? 2, Math.round(children / units * u || 0))); }} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">−</button>
                            <button type="button" onClick={() => { const u = Math.min(maxUnits, units + 1); setUnits(u); setAdults(Math.min(selectedRoom?.maxAdults ?? 2, Math.round(adults / units * u || 1))); setChildren(Math.min(selectedRoom?.maxChildren ?? 2, Math.round(children / units * u || 0))); }} className="h-6 w-6 rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 text-xs">+</button>
                          </div>
                        </div>
                      </Field>
                    </div>
                    <Field label="Suite">
                      <select
                        value={roomId}
                        onChange={(e) => { setRoomId(e.target.value); setUnits(1); }}
                        className="booking-input"
                      >
                        {pmsRooms.map((r) => {
                            const avail = r.availableUnits ?? r.units;
                            return (
                              <option key={r.id} value={r.id} className="bg-black" disabled={avail === 0}>
                                {r.name} — {formatPrice(r.currentPrice, "INR")}/night {avail > 0 ? `(${avail} left)` : "(sold out)"}
                              </option>
                            );
                          })}
                      </select>
                    </Field>

                    <Field label="Meal plan">
                      <select
                        value={mealCode}
                        onChange={(e) => setMealCode(e.target.value)}
                        className="booking-input"
                      >
                        <option value="" className="bg-black">No meal plan</option>
                        {pmsMeals.map((m) => (
                          <option key={m.code} value={m.code} className="bg-black">
                            {m.name} {m.price > 0 ? `+ ${formatPrice(m.price, "INR")}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {error && (
                      <p className="text-[11px] text-rose-300" style={{ fontFamily: "var(--font-body)" }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-2 w-full overflow-hidden rounded-full bg-white py-4 text-[11px] uppercase tracking-[0.4em] text-black disabled:opacity-50"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <span className="relative z-10 transition-colors group-hover:text-white">
                        {submitting ? "Submitting..." : "Confirm Reservation"}
                      </span>
                      <span className="absolute inset-0 -translate-x-full bg-[#C8A86B] transition-transform duration-500 group-hover:translate-x-0" />
                    </button>
                    <p className="text-center text-[10px] text-white/40" style={{ fontFamily: "var(--font-body)" }}>
                      Free cancellation up to 48 hours before check-in. No booking fees.
                    </p>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-10 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.05] p-8 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/50 text-emerald-200">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>
                      Request received
                    </h3>
                    <p className="mt-2 text-sm text-white/70" style={{ fontFamily: "var(--font-body)" }}>
                      Our reservations team will confirm your stay at {hotel.name} within the hour.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        toggle(false);
                      }}
                      className="mt-6 text-[11px] uppercase tracking-[0.3em] text-white/60 hover:text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="relative border-t border-white/10 bg-white/[0.02] p-8 md:p-12 lg:border-l lg:border-t-0">
                <div
                  className="text-[10px] uppercase tracking-[0.45em] text-white/50"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Summary
                </div>
                {selectedRoom && (
                  <div className="mt-4">
                    <h3 className="mt-2 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>
                      {selectedRoom.name}
                    </h3>
                    <div className="mt-4 space-y-1 text-sm text-white/70" style={{ fontFamily: "var(--font-body)" }}>
                      <div>{formatPrice(roomPrice, "INR")} / unit / night</div>
                      <div className="text-[11px] text-white/50">Up to {selectedRoom.maxAdults} adults + {selectedRoom.maxChildren} children per unit</div>
                      {selectedRoom.childPolicy && <div className="text-[10px] text-white/40 italic">{selectedRoom.childPolicy}</div>}
                      {selectedMeal && <div>+ {selectedMeal.name} ({formatPrice(mealPrice, "INR")}/adult, half for children)</div>}
                    </div>
                  </div>
                )}

                <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                  <Line label={`${units} × ${selectedRoom?.name ?? "Suite"} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={formatPrice(roomTotal, "INR")} />
                  {mealPrice > 0 && <Line label={`Meal plan (${adults} adults + ${children} children)`} value={formatPrice(mealTotal, "INR")} />}
                  <Line label="Taxes & service" value={formatPrice(taxes, "INR")} muted />
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <Line label="Total" value={formatPrice(total, "INR")} large />
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[11px] text-white/55" style={{ fontFamily: "var(--font-body)" }}>
                  <div className="flex items-center gap-2 text-white/80">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" />
                    </svg>
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="text-[10px] uppercase tracking-[0.35em] text-white/50"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Line({
  label,
  value,
  muted,
  accent,
  large,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-white/45" : "text-white/80"}>{label}</span>
      <span
        className={
          large
            ? "text-2xl font-light text-white"
            : accent
            ? "text-emerald-300/90"
            : "text-white/85"
        }
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
    </div>
  );
}
