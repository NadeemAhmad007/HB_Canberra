"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { formatPrice } from "@/lib/math";
import Link from "next/link";

const GST_RATE = 0.12;

export default function BookingPage() {
  const pms = useStore((s) => s.pms);
  const pmsLoading = useStore((s) => s.pmsLoading);
  const fetchPms = useStore((s) => s.fetchPms);

  const pmsRooms = useMemo(() => pms?.rooms ?? [], [pms]);
  const pmsMeals = useMemo(() => pms?.mealPlans ?? [], [pms]);
  const settings = useMemo(() => pms?.settings ?? {}, [pms]);

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
  const [notes, setNotes] = useState("");
  const [tcAccepted, setTcAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [availData, setAvailData] = useState<Record<string, { blocked: string[]; bookings: any[]; totalUnits: number }>>({});

  useEffect(() => { fetchPms(); }, [fetchPms]);

  useEffect(() => {
    if (!roomId && pmsRooms.length > 0) setRoomId(String(pmsRooms[0].id));
  }, [pmsRooms, roomId]);

  useEffect(() => {
    if (checkIn && checkOut) fetchPms(checkIn, checkOut);
  }, [checkIn, checkOut, fetchPms]);

  // Fetch availability calendar data
  const fetchAvailability = useCallback(async (roomIdNum: number, month: number, year: number) => {
    try {
      const res = await fetch(`/api/availability?roomId=${roomIdNum}&month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setAvailData(prev => ({ ...prev, [`${roomIdNum}-${year}-${month}`]: data }));
      }
    } catch { }
  }, []);

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
  const cancellationPolicy = settings?.cancellation_policy || "Free cancellation up to 7 days before check-in. 50% charge within 7 days. No refund after check-in.";
  const tourUrl = selectedRoom?.tourUrl || "";

  // Availability calendar for selected room
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const calKey = selectedRoom ? `${selectedRoom.id}-${calYear}-${calMonth + 1}` : "";
  const calData = calKey ? availData[calKey] : null;

  useEffect(() => {
    if (selectedRoom) {
      fetchAvailability(selectedRoom.id, calMonth + 1, calYear);
    }
  }, [selectedRoom, calMonth, calYear, fetchAvailability]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();

  const statusForDay = (d: number) => {
    if (!calData || !selectedRoom) return "future";
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (dateStr < minDate) return "past";
    if (calData.blocked.includes(dateStr)) return "blocked";
    const totalBooked = calData.bookings
      .filter((b: any) => dateStr >= b.checkIn && dateStr < b.checkOut)
      .reduce((s: number, b: any) => s + b.units, 0);
    if (totalBooked >= calData.totalUnits) return "full";
    return "available";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (!tcAccepted) { setError("Please accept the terms & conditions"); return; }
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
        body: JSON.stringify({ guestName, phone, email, roomId, mealCode, adults, children, units, checkIn, checkOut, nights, amount: total, notes, tcAccepted }),
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
          <p className="mt-3 text-white/70">We&apos;ll confirm your stay at Houseboat Canberra within the hour. A confirmation email is on its way.</p>
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
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#C8A86B]" style={{ fontFamily: "var(--font-display)" }}>Reserve</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="mb-12">
          <h1 className="text-4xl font-light md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>Book your stay</h1>
          <p className="mt-3 text-white/60 max-w-xl">Direct reservation on Dal Lake. Real-time availability, no booking fees.</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            {pmsLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-white/50">Loading rates...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Room gallery & virtual tour */}
                {selectedRoom && (
                  <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <div className="aspect-video relative bg-white/[0.03]">
                      {tourUrl && !showTour ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button type="button" onClick={() => setShowTour(true)} className="flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md px-6 py-3 text-sm hover:bg-white/20 transition">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
                            Take 360° Virtual Tour
                          </button>
                        </div>
                      ) : tourUrl && showTour ? (
                        <div className="relative w-full h-full">
                          <iframe id="tour-embeded" name="Houseboat Canberra" src={tourUrl} frameBorder="0" width="100%" height="100%" scrolling="no" allow="vr; xr; accelerometer; gyroscope; autoplay;" />
                          <button type="button" onClick={() => setShowTour(false)} className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wider text-white/80">Close Tour</button>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">Room preview</div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-light" style={{ fontFamily: "var(--font-display)" }}>{selectedRoom.name}</h3>
                      {selectedRoom.description && <p className="mt-2 text-sm text-white/60 leading-relaxed">{selectedRoom.description}</p>}
                      {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(selectedRoom.amenities as string[]).map((a: string) => (
                            <span key={a} className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability calendar */}
                {selectedRoom && (
                  <div className="rounded-2xl border border-white/10 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase tracking-[0.35em] text-white/50">Availability</span>
                      <div className="flex items-center gap-3 text-xs">
                        <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="text-white/40 hover:text-white">←</button>
                        <span className="text-white/70 min-w-20 text-center">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][calMonth]} {calYear}</span>
                        <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="text-white/40 hover:text-white">→</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="text-[9px] uppercase tracking-wider text-white/30 py-1">{d}</div>)}
                      {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const d = i + 1;
                        const st = statusForDay(d);
                        const isSelected = checkIn && `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` === checkIn;
                        const isRange = checkIn && checkOut && `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` > checkIn && `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` < checkOut;
                        return (
                          <div key={d} className={`py-1.5 text-[11px] rounded ${st === "past" ? "text-white/10" : st === "blocked" || st === "full" ? "text-rose-400/50 bg-rose-500/10 cursor-not-allowed" : st === "available" ? "text-emerald-300/70 hover:bg-white/5 cursor-pointer" : "text-white/40"} ${isSelected ? "ring-1 ring-[#C8A86B] bg-[#C8A86B]/10" : ""} ${isRange ? "bg-white/[0.03]" : ""}`}
                            onClick={() => {
                              if (st === "available" || st === "future") {
                                const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                                if (!checkIn || (checkIn && checkOut)) {
                                  setCheckIn(ds); setCheckOut("");
                                } else if (ds > checkIn) {
                                  setCheckOut(ds);
                                } else {
                                  setCheckIn(ds); setCheckOut("");
                                }
                              }
                            }}
                          >{d}</div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 text-[9px] uppercase tracking-wider text-white/40">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-300/50" /> Available</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-rose-400/50" /> Blocked / Full</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 border border-white/20 rounded-full" /> Past</span>
                    </div>
                  </div>
                )}

                {/* Guest details */}
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

                {/* Dates */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Check-in">
                    <input type="date" value={checkIn} min={minDate} onChange={(e) => setCheckIn(e.target.value)} className="booking-input" />
                  </Field>
                  <Field label="Check-out">
                    <input type="date" value={checkOut} min={checkIn || minDate} onChange={(e) => setCheckOut(e.target.value)} className="booking-input" />
                  </Field>
                </div>

                {/* Guests + Units */}
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Adults">
                    <Stepper value={adults} min={1} max={selectedRoom?.maxAdults ?? 4} onChange={setAdults} />
                  </Field>
                  <Field label="Children">
                    <Stepper value={children} min={0} max={selectedRoom?.maxChildren ?? 2} onChange={setChildren} />
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

                {/* Room selection */}
                <Field label="Suite">
                  <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setUnits(1); setShowTour(false); }} className="booking-input">
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

                {/* Meal plan */}
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

                {/* Special requests */}
                <Field label="Special requests (optional)">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Dietary requirements, anniversary celebration, late arrival..." className="booking-input resize-none" />
                </Field>

                {/* Cancellation policy */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 mt-0.5 text-white/40 shrink-0"><path d="M12 2v20M2 12h20"/></svg>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.35em] text-white/50">Cancellation policy</span>
                      <p className="mt-1 text-[12px] text-white/50 leading-relaxed">{cancellationPolicy}</p>
                    </div>
                  </div>
                </div>

                {/* T&C */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={tcAccepted} onChange={(e) => setTcAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-[#C8A86B]" />
                  <span className="text-[12px] text-white/60 leading-relaxed">
                    I accept the <span className="text-[#C8A86B] underline">terms & conditions</span> and cancellation policy.
                  </span>
                </label>

                {error && <p className="text-sm text-rose-300">{error}</p>}

                <button type="submit" disabled={submitting} className="group relative w-full overflow-hidden rounded-full bg-white py-4 text-[11px] uppercase tracking-[0.4em] text-black disabled:opacity-50" style={{ fontFamily: "var(--font-display)" }}>
                  <span className="relative z-10 transition-colors group-hover:text-white">{submitting ? "Submitting..." : "Confirm Reservation"}</span>
                  <span className="absolute inset-0 -translate-x-full bg-[#C8A86B] transition-transform duration-500 group-hover:translate-x-0" />
                </button>
              </form>
            )}
          </div>

          {/* Summary sidebar */}
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
            {/* Cancellation summary */}
            <div className="mt-4 rounded-xl border border-rose-500/10 bg-rose-500/[0.03] p-4 text-[10px] text-white/40">
              <div className="font-medium text-rose-300/80 uppercase tracking-wider mb-1">Cancel policy</div>
              {cancellationPolicy}
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

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm">{value}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">−</button>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-7 w-7 rounded-full border border-white/15 text-white/80 hover:bg-white/10 text-xs">+</button>
      </div>
    </div>
  );
}
