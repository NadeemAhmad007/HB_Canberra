import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const alt =
  "Houseboat Canberra · A heritage sanctuary on Dal Lake, Srinagar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const dynamic = "force-static";

export default async function Image() {
  // Background — deck view, resized small enough for Satori's 500KB limit
  const bgPath = join(process.cwd(), "public", "og-bg.jpg");
  const bgBuf = await sharp(await readFile(bgPath))
    .resize(1200, 630)
    .jpeg({ quality: 70 })
    .toBuffer();
  const bgDataUrl = `data:image/jpeg;base64,${bgBuf.toString("base64")}`;

  // Logo
  const logoPath = join(process.cwd(), "public", "HB_Logo_No_BG.png");
  const logoBuf = await sharp(await readFile(logoPath))
    .resize({ width: 240, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const logoDataUrl = `data:image/png;base64,${logoBuf.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A1F44",
          position: "relative",
          fontFamily: "serif",
          overflow: "hidden",
        }}
      >
        {/* Background image — absolutely positioned */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgDataUrl}
          width={1200}
          height={630}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Dark overlay gradient — absolute */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Top eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              color: "#C8A86B",
              fontSize: 18,
              letterSpacing: 8,
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            <div
              style={{ width: 48, height: 1, backgroundColor: "#C8A86B" }}
            />
            <span>Est. 1980 · Dal Lake</span>
            <div
              style={{ width: 48, height: 1, backgroundColor: "#C8A86B" }}
            />
          </div>

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            width={200}
            height={200}
            alt="Houseboat Canberra"
            style={{ marginBottom: 28 }}
          />

          {/* Brand name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "white",
              lineHeight: 1.0,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 300,
                letterSpacing: -1,
              }}
            >
              Houseboat
            </span>
            <span
              style={{
                fontSize: 72,
                fontWeight: 300,
                letterSpacing: -1,
                color: "#C8A86B",
                marginTop: -4,
              }}
            >
              Canberra
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              marginTop: 24,
              fontSize: 22,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              maxWidth: 700,
            }}
          >
            A heritage sanctuary on the still waters of Dal Lake
          </div>
        </div>

        {/* Footer location */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontFamily: "sans-serif",
          }}
        >
          Srinagar · Kashmir
        </div>
      </div>
    ),
    { ...size }
  );
}
