"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";

export function GallerySection() {
  const pms = useStore((s) => s.pms);
  const pmsLoading = useStore((s) => s.pmsLoading);
  const fetchPms = useStore((s) => s.fetchPms);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showTour, setShowTour] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => { if (!pms) fetchPms(); }, [pms, fetchPms]);

  const rooms = useMemo(() => pms?.rooms ?? [], [pms]);

  const activeRoom = rooms.find((r) => r.id === selectedId) ?? rooms[0] ?? null;

  if (pmsLoading || rooms.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="gallery"
      className="relative z-20 min-h-screen w-full overflow-hidden bg-[#0A0D0C]"
    >
      {/* Garden background image — no persons visible */}
      <div className="absolute inset-0">
        <img
          src="/panoramas/garden-1.jpg"
          alt=""
          className="h-full w-full object-cover opacity-60"
          style={{ filter: "saturate(0.7) brightness(0.5)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D0C]/70 via-[#0A0D0C]/40 to-[#0A0D0C]/90" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-24 md:px-12">
        <div className="mb-12">
          <div
            className="text-[10px] uppercase tracking-[0.5em] text-[#C8A86B]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Explore our spaces
          </div>
          <h2
            className="mt-4 text-4xl font-light leading-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A home on the lake
          </h2>
          <p
            className="mt-3 max-w-xl text-sm text-white/60"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Every room on Houseboat Canberra opens onto the lake. Cedar, linen, and light — the quiet rhythm of Dal Lake.
          </p>
        </div>

        {/* Room cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => {
            const isActive = activeRoom?.id === room.id;
            return (
              <motion.button
                key={room.id}
                type="button"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  setSelectedId(room.id);
                  setShowTour(false);
                }}
                className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-500 ${
                  isActive
                    ? "border-[#C8A86B]/60 bg-[#C8A86B]/8"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.4em] text-[#C8A86B]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  0{i + 1}
                </div>
                <h3
                  className="mt-2 text-xl font-light"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {room.name}
                </h3>
                {room.description && (
                  <p
                    className="mt-2 text-[13px] leading-relaxed text-white/60 line-clamp-2"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {room.description}
                  </p>
                )}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 4).map((a: string) => (
                      <span
                        key={a}
                        className="rounded-full border border-white/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40"
                      >
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span className="text-[9px] text-white/30 self-center">
                        +{room.amenities.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-white/50">
                  <span>{room.maxAdults} adult{room.maxAdults > 1 ? "s" : ""}</span>
                  {room.maxChildren > 0 && <span>· {room.maxChildren} child{room.maxChildren > 1 ? "ren" : ""}</span>}
                  <span>· {room.units} unit{room.units > 1 ? "s" : ""}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Active room detail + 360° tour */}
        <AnimatePresence mode="wait">
          {activeRoom && (
            <motion.div
              key={activeRoom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm"
            >
              <div className="grid md:grid-cols-[1fr_1.2fr]">
                {/* Tour / image area */}
                <div className="relative aspect-video md:aspect-auto bg-white/[0.02] flex items-center justify-center overflow-hidden min-h-[240px]">
                  {activeRoom.tourUrl && !showTour && (
                    <button
                      type="button"
                      onClick={() => setShowTour(true)}
                      className="flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md px-6 py-3 text-sm hover:bg-white/20 transition z-10"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                        <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
                      </svg>
                      Take 360° Virtual Tour
                    </button>
                  )}
                  {activeRoom.tourUrl && showTour && (
                    <div className="absolute inset-0">
                      <iframe
                        title="360 Tour"
                        src={activeRoom.tourUrl}
                        frameBorder="0"
                        width="100%"
                        height="100%"
                        scrolling="no"
                        allow="vr; xr; accelerometer; gyroscope; autoplay;"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTour(false)}
                        className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wider text-white/80 z-20"
                      >
                        Close Tour
                      </button>
                    </div>
                  )}
                  {!activeRoom.tourUrl && (
                    <div className="text-white/20 text-sm flex flex-col items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-10 w-10">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span>Room gallery</span>
                    </div>
                  )}
                </div>

                {/* Room details */}
                <div className="p-6 md:p-8">
                  <h3
                    className="text-2xl font-light"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {activeRoom.name}
                  </h3>
                  {activeRoom.description && (
                    <p
                      className="mt-3 text-sm leading-relaxed text-white/70"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {activeRoom.description}
                    </p>
                  )}
                  {activeRoom.amenities && activeRoom.amenities.length > 0 && (
                    <div className="mt-5">
                      <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">Amenities</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(activeRoom.amenities as string[]).map((a: string) => (
                          <span key={a} className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex items-center gap-4 text-sm text-white/60">
                    <span>₹{activeRoom.basePrice?.toLocaleString()}/night</span>
                    <span className="text-white/20">|</span>
                    <span>{activeRoom.maxAdults} adult{activeRoom.maxAdults > 1 ? "s" : ""}</span>
                    {activeRoom.maxChildren > 0 && <><span className="text-white/20">|</span><span>{activeRoom.maxChildren} child{activeRoom.maxChildren > 1 ? "ren" : ""}</span></>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
