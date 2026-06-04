import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  description:
    "Your reservation at Houseboat Canberra is confirmed. Review your booking details, payment status, and next steps for your stay on Dal Lake.",
  alternates: { canonical: "/booking/confirm" },
  robots: { index: false, follow: false },
};

export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://houseboatcanberra.com/" },
          { name: "Booking", url: "https://houseboatcanberra.com/booking" },
          { name: "Confirmation", url: "https://houseboatcanberra.com/booking/confirm" },
        ]}
      />
      {children}
    </>
  );
}
