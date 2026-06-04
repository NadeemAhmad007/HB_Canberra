import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Book Your Stay",
  description:
    "Reserve a suite at Houseboat Canberra on Dal Lake, Srinagar. Check live availability, view seasonal rates, and confirm your booking in minutes.",
  alternates: { canonical: "/booking" },
  openGraph: {
    title: "Book Your Stay at Houseboat Canberra",
    description:
      "Reserve a suite at Houseboat Canberra on Dal Lake, Srinagar.",
    url: "https://houseboatcanberra.com/booking",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://houseboatcanberra.com/" },
          { name: "Booking", url: "https://houseboatcanberra.com/booking" },
        ]}
      />
      {children}
    </>
  );
}
