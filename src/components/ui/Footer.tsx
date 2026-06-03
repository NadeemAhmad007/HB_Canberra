"use client";

import { useStore } from "@/store/useStore";
import { QRCodeSVG } from "qrcode.react";
import { BrandMark } from "@/components/BrandMark";

export function Footer() {
  const hotel = useStore((s) => s.hotel);
  const { contact, social } = hotel;

  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    "Hi, I'd like to know more about Houseboat Canberra."
  )}`;

  return (
    <footer className="relative z-30 bg-[#0A0D0C] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <BrandMark size={132} alt={hotel.name} />
            <div
              className="mt-5 text-xl font-light tracking-[0.32em] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {hotel.name}
            </div>
            <p
              className="mt-4 max-w-xs text-sm text-white/60"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {hotel.description}
            </p>
          </div>

          {/* Address — linked to Google Maps */}
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.4em] text-white/45"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Address
            </div>
            <a
              href={contact.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-sm text-white/80 transition-colors hover:text-[#C8A86B]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {contact.address}
              <span className="mt-2 inline-block text-[10px] uppercase tracking-[0.3em] text-white/45">
                Open in Google Maps →
              </span>
            </a>
          </div>

          {/* Contact */}
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.4em] text-white/45"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Reservations
            </div>
            <div className="mt-3 space-y-1 text-sm text-white/80" style={{ fontFamily: "var(--font-body)" }}>
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="block transition-colors hover:text-[#C8A86B]">
                {contact.phone}
              </a>
              <a href={`mailto:${contact.email}`} className="block transition-colors hover:text-[#C8A86B]">
                {contact.email}
              </a>
            </div>

            <div
              className="mt-8 text-[10px] uppercase tracking-[0.4em] text-white/45"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Follow
            </div>
            <ul className="mt-3 space-y-1">
              {social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/80 transition-colors hover:text-[#C8A86B]"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {s.label} →
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp QR (rendered live from the phone number — no image file needed) */}
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.4em] text-white/45"
              style={{ fontFamily: "var(--font-display)" }}
            >
              WhatsApp
            </div>
            <div className="mt-3 flex items-start gap-4">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/10 transition-transform hover:scale-[1.02]"
                aria-label="Open WhatsApp chat"
              >
                <QRCodeSVG
                  value={waLink}
                  size={120}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#0A0D0C"
                />
              </a>
              <div>
                <p className="text-sm text-white/80" style={{ fontFamily: "var(--font-body)" }}>
                  Scan to chat with us on WhatsApp.
                </p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[#C8A86B] transition-colors hover:text-white"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Open chat →
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-[10px] uppercase tracking-[0.4em] text-white/35 md:flex-row md:items-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span>© {new Date().getFullYear()} {hotel.name}. All rights reserved.</span>
          <span>Crafted on the lake.</span>
        </div>
      </div>
    </footer>
  );
}
