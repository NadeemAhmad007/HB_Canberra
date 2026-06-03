"use client";

import { useState } from "react";

interface Props {
  /** Height in pixels (the logo is roughly square). */
  size?: number;
  /** Optional className for the wrapper. */
  className?: string;
  /** Accessible label. */
  alt?: string;
}

/**
 * Brand mark. Reads /logo.png from the public folder. If the file is
 * missing (broken image), the component renders a clean SVG fallback so
 * the site never shows a broken-image glyph.
 */
export function BrandMark({ size = 48, className = "", alt = "Houseboat Canberra" }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <FallbackMark size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/HB_Logo_No_BG.png"
      alt={alt}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={className}
      style={{
        width: size,
        height: size,
        display: "block",
        borderRadius: "50%",
        // Invert the source so the navy text reads as white on the dark
        // site, and the dark radial background becomes a light plate.
        // No offset ring.
        filter: "invert(1) brightness(1.02)",
      }}
    />
  );
}

/** Inline fallback that approximates the navy + gold circular emblem. */
function FallbackMark({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ display: "block" }}
      aria-hidden
    >
      <circle cx="60" cy="60" r="57" fill="none" stroke="#0A1F44" strokeWidth="2" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="#C8A86B" strokeWidth="1" />
      <text
        x="60"
        y="28"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="9"
        letterSpacing="2"
        fill="#0A1F44"
        fontWeight="600"
      >
        HOUSEBOAT CANBERRA
      </text>
      <g transform="translate(60 65)" fill="none" stroke="#0A1F44" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -22 8 L 22 8 L 20 -6 L -20 -6 Z" />
        <rect x="-18" y="-6" width="36" height="14" />
        <rect x="-12" y="-2" width="6" height="6" fill="#0A1F44" />
        <rect x="-2" y="-2" width="6" height="6" fill="#0A1F44" />
        <rect x="8" y="-2" width="6" height="6" fill="#0A1F44" />
        <path d="M -22 8 Q -10 14 0 14 Q 10 14 22 8" />
        <line x1="-2" y1="-6" x2="-2" y2="-12" />
        <circle cx="-2" cy="-13" r="1" fill="#0A1F44" />
      </g>
      <text
        x="60"
        y="92"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="7"
        letterSpacing="2"
        fill="#0A1F44"
      >
        — EST. 1980 —
      </text>
    </svg>
  );
}
