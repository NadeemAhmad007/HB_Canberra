"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useState } from "react";
import { formatPrice } from "@/lib/math";

/**
 * Floating glass room info panel. Slides in from the right when a room scene
 * is active and the user has opened it. Includes gallery, specs, CTAs.
 */
export function RoomPanel() {
  const hotel = useStore((s) => s.hotel);
  const showRoom = useStore((s) => s.showRoom);
  const selectedRoomId = useStore((s) => s.selectedRoomId);
  const toggleRoom = useStore((s) => s.toggleRoom);
  const toggleBooking = useStore((s) => s.toggleBooking);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const scene = hotel.scenes.find((s) => s.id === selectedRoomId);
  const room = scene?.room;

  if (!room) return null;

  const availabilityLabel = {
    available: "Available",
    limited: "Limited",
    unavailable: "Unavailable",
  }[room.availability];
  const availabilityColor = {
    available: "bg-emerald-400/90",
    limited: "bg-amber-300/90",
    unavailable: "bg-rose-400/90",
  }[room.availability];

  return (
    <AnimatePresence>
      {showRoom && (
        <motion.aside
          key={room.id}
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-0 top-0 z-40 h-full w-full max-w-[460px] overflow-y-auto border-l border-white/10 bg-black/40 backdrop-blur-2xl"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(20,20,20,0.7) 0%, rgba(8,8,10,0.85) 100%)",
            boxShadow: "-30px 0 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Close */}
          <button
            onClick={() => toggleRoom(null)}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          {/* Gallery */}
          <div className="relative h-[300px] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={galleryIndex}
                src={room.gallery[galleryIndex]?.src}
                alt={room.gallery[galleryIndex]?.alt}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.4em] text-white/70"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {room.tagline}
                </div>
                <h3
                  className="mt-2 text-3xl font-light text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {room.name}
                </h3>
              </div>
              <span className={`flex items-center gap-1.5 rounded-full ${availabilityColor} px-2.5 py-1 text-[9px] uppercase tracking-[0.3em] text-black/80`}
                style={{ fontFamily: "var(--font-display)" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-black/60" />
                {availabilityLabel}
              </span>
            </div>
            {/* Gallery dots */}
            <div className="absolute bottom-2 right-5 flex gap-1.5">
              {room.gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === galleryIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-8 text-white/90">
            <p className="text-[15px] leading-relaxed text-white/80" style={{ fontFamily: "var(--font-body)" }}>
              {room.description}
            </p>

            {/* Specs grid */}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <Spec label="Size" value={room.size} />
              <Spec label="Occupancy" value={room.occupancy} />
              <Spec label="Bed" value={room.bedType} />
              <Spec label="View" value={room.view} />
            </div>

            {/* Amenities */}
            <div className="mt-7">
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/50" style={{ fontFamily: "var(--font-display)" }}>
                In the room
              </div>
              <ul className="mt-3 space-y-2">
                {room.amenities.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/85" style={{ fontFamily: "var(--font-body)" }}>
                    <span className="h-1 w-1 rounded-full bg-[#C8A86B]" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Price */}
            <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.4em] text-white/50" style={{ fontFamily: "var(--font-display)" }}>
                  From
                </div>
                <div className="mt-1 text-2xl font-light text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {formatPrice(room.priceFrom, room.currency)}
                </div>
                <div className="text-[11px] text-white/50">per night, taxes included</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 grid gap-3">
              <button
                onClick={() => toggleBooking(true)}
                className="group relative overflow-hidden rounded-full bg-white px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] text-black transition"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="relative z-10 transition-colors group-hover:text-white">Book Now</span>
                <span className="absolute inset-0 -translate-x-full bg-[#C8A86B] transition-transform duration-500 group-hover:translate-x-0" />
              </button>
              <button
                onClick={() => toggleBooking(true)}
                className="rounded-full border border-white/25 px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] text-white/90 transition hover:bg-white/10"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Check Availability
              </button>
              <a
                href="#scene-reception"
                onClick={() => toggleRoom(null)}
                className="text-center text-[10px] uppercase tracking-[0.3em] text-white/50 transition hover:text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                View Floor Plan →
              </a>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[9px] uppercase tracking-[0.35em] text-white/45" style={{ fontFamily: "var(--font-display)" }}>
        {label}
      </div>
      <div className="mt-1 text-sm text-white/90" style={{ fontFamily: "var(--font-body)" }}>
        {value}
      </div>
    </div>
  );
}
