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
  // Resize the brand mark once per build and embed as PNG.
  // Satori's bundle limit is 500KB, so we keep it small.
  const logoPath = join(process.cwd(), "public", "HB_Logo_No_BG.png");
  const logoBuffer = await readFile(logoPath);
  const logoPng = await sharp(logoBuffer)
    .resize({ width: 360, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Satori/ImageResponse needs the image as a data URL (its src type
  // is `string | Blob`, not ArrayBuffer). Base64 a ~360px PNG and embed.
  const logoDataUrl = `data:image/png;base64,${logoPng.toString("base64")}`;

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
          background:
            "linear-gradient(155deg, #0A1F44 0%, #132B5C 45%, #0A1F44 75%, #050A18 100%)",
          padding: "60px 80px",
          position: "relative",
          fontFamily: "serif",
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
            marginBottom: 36,
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: 48,
              height: 1,
              background: "#C8A86B",
            }}
          />
          <span>Est. 1980 · Dal Lake</span>
          <div
            style={{
              width: 48,
              height: 1,
              background: "#C8A86B",
            }}
          />
        </div>

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUrl}
          width={220}
          height={220}
          alt="Houseboat Canberra"
          style={{ marginBottom: 32 }}
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
              fontSize: 84,
              fontWeight: 300,
              letterSpacing: -1,
            }}
          >
            Houseboat
          </span>
          <span
            style={{
              fontSize: 84,
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
            marginTop: 32,
            fontSize: 26,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.78)",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          A heritage sanctuary on the still waters of Dal Lake
        </div>

        {/* Footer location */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            color: "rgba(255,255,255,0.55)",
            fontSize: 15,
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
