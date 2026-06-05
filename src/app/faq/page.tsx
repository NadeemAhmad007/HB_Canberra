import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about staying at Houseboat Canberra on Dal Lake, Srinagar — booking, amenities, food, transfers and more.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — Houseboat Canberra",
    description: "Everything you need to know before your stay.",
  },
};

const faqs = [
  {
    question: "How do I make a booking?",
    answer:
      "You can book directly through our website at houseboatcanberra.com/booking. Select your dates, room type, and any meal plans, then submit your enquiry. Our team will confirm availability and send payment details within 24 hours.",
  },
  {
    question: "What are the check-in and check-out times?",
    answer:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be arranged upon request, subject to availability.",
  },
  {
    question: "Is breakfast included?",
    answer:
      "A complimentary breakfast is served each morning on the deck overlooking Dal Lake. Lunch and dinner are available à la carte or as part of a full-board meal plan, featuring traditional Kashmiri Wazwan and continental dishes.",
  },
  {
    question: "What amenities does the houseboat offer?",
    answer:
      "All suites feature cedar-panelled interiors, hand-knotted Kashmiri carpets, en-suite bathrooms, free Wi-Fi, room service, and lake-view windows. Common areas include a dining room, a sun deck, and a garden. We also offer airport transfers, shikara rides, and guided tours.",
  },
  {
    question: "How do I get to Houseboat Canberra?",
    answer:
      "We are located at Gate no 13, Dal Lake Boulevard Road, Srinagar. Sheikh ul-Alam International Airport (SXR) is about 30 minutes by car. We can arrange a private airport transfer for you — just let us know your flight details.",
  },
  {
    question: "Is parking available?",
    answer:
      "Yes, secure parking is available near the jetty. Our staff will assist you with luggage and guide you to the houseboat.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Cancellations made 7 days or more before check-in receive a full refund. Cancellations within 3–6 days receive a 50% refund. Cancellations less than 72 hours before check-in are non-refundable. No-show charges apply in full.",
  },
  {
    question: "Do you offer airport transfers?",
    answer:
      "Yes, we offer private airport transfers from Srinagar Airport to the houseboat jetty. Please provide your flight details at the time of booking so we can arrange your pickup.",
  },
  {
    question: "Are pets allowed?",
    answer:
      "Unfortunately, pets are not allowed on the houseboat. We apologise for any inconvenience.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept bank transfers (NEFT/RTGS/IMPS), UPI (Google Pay, PhonePe, Paytm), and major credit/debit cards. Full payment details will be shared once your booking is confirmed.",
  },
  {
    question: "Is the houseboat suitable for children?",
    answer:
      "Yes, families with children are welcome. Life jackets are provided, and the deck area is safely enclosed. Please supervise children near the water at all times.",
  },
  {
    question: "Can I host an event or celebration on the houseboat?",
    answer:
      "We can accommodate small private events, anniversaries, and celebrations. Please contact us in advance to discuss arrangements and menu options.",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
        id="ld-json-faq"
      />
      <main className="min-h-screen bg-[#0A0D0C] pt-36 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1
            className="text-3xl font-light tracking-[0.15em] uppercase text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Frequently Asked Questions
          </h1>
          <p
            className="mt-4 text-sm text-white/50 tracking-wider max-w-xl"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Everything you need to know before your stay at Houseboat Canberra.
          </p>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20"
              >
                <summary
                  className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm text-white/85 tracking-wide transition-colors hover:text-white list-none"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <span className="pr-4">{faq.question}</span>
                  <span className="shrink-0 text-[#C8A86B] transition-transform duration-300 group-open:rotate-180">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-white/5 px-6 py-5 text-sm text-white/60 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
