import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://houseboatcanberra.com";
const OG_IMAGE = `${SITE_URL}/og.svg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Houseboat Canberra · A Heritage Sanctuary on Dal Lake",
    template: "%s · Houseboat Canberra",
  },
  description:
    "Cedar-panelled suites, hand-knotted Kashmiri carpets and the stillness of the lake at dawn. A discreet, family-run residence in Srinagar.",
  applicationName: "Houseboat Canberra",
  authors: [{ name: "Houseboat Canberra" }],
  generator: "Next.js",
  keywords: [
    "Houseboat Canberra",
    "Srinagar",
    "Dal Lake",
    "luxury houseboat",
    "Kashmir",
    "heritage houseboat",
    "Kashmiri hospitality",
    "boutique stay",
  ],
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Houseboat Canberra · A Heritage Sanctuary on Dal Lake",
    description:
      "Cedar-panelled suites and the stillness of the lake at dawn. Reserve direct.",
    url: SITE_URL,
    siteName: "Houseboat Canberra",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Houseboat Canberra at dusk on Dal Lake, Srinagar",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Houseboat Canberra · A Heritage Sanctuary on Dal Lake",
    description:
      "Cedar-panelled suites and the stillness of the lake at dawn. Reserve direct.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9DFCE" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1F44" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const HOTEL_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "Houseboat Canberra",
  description:
    "A heritage houseboat residence on Dal Lake in Srinagar, Kashmir — cedar-panelled suites, hand-knotted carpets, family-run.",
  url: SITE_URL,
  image: OG_IMAGE,
  telephone: "+49 176 84005474",
  email: "Houseboat.canberra@gmail.com",
  priceRange: "₹₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Gate no 13, Dal Lake Boulevard Road",
    addressLocality: "Srinagar",
    addressRegion: "Jammu & Kashmir",
    postalCode: "190001",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 34.0837,
    longitude: 74.7973,
  },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Airport transfer", value: true },
    { "@type": "LocationFeatureSpecification", name: "Lake view suites", value: true },
    { "@type": "LocationFeatureSpecification", name: "Spa", value: true },
    { "@type": "LocationFeatureSpecification", name: "Restaurant", value: true },
  ],
  starRating: { "@type": "Rating", ratingValue: "4.8" },
  petsAllowed: false,
  checkinTime: "14:00",
  checkoutTime: "11:00",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full bg-[#0A0D0C] text-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.3em] focus:text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Skip to main content
        </a>
        <script
          id="ld-json-hotel"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(HOTEL_JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
