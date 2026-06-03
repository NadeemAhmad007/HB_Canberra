import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createBooking } from "@/lib/db";

async function getStripe() {
  const { default: Stripe } = await import("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events. On checkout.session.completed,
 * writes the booking to Neon and sends email confirmation (optional).
 */
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature")!;
  const stripe = await getStripe();
  let event: Stripe.Event;

  try {
    const buf = await request.arrayBuffer();
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    const booking = {
      booking_ref: `HBC-${Date.now().toString(36).toUpperCase()}`,
      guest_name: metadata.guest_name || "",
      phone: metadata.phone || "",
      email: session.customer_details?.email || "",
      room_id: parseInt(metadata.room_id || "1"),
      meal_code: metadata.meal_code || "",
      adults: parseInt(metadata.adults || "2"),
      children: parseInt(metadata.children || "0"),
      units: parseInt(metadata.units || "1"),
      check_in: metadata.check_in || "",
      check_out: metadata.check_out || "",
      nights: parseInt(metadata.nights || "1"),
      amount: session.amount_total ? Math.round(session.amount_total / 100) : 0,
      currency: session.currency?.toUpperCase() || "INR",
      stripe_payment_intent: session.payment_intent as string || "",
      status: "confirmed",
      invoice_url: session.invoice?.toString() || "",
    };

    await createBooking(booking);

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Houseboat Canberra <bookings@houseboatcanberra.com>",
          to: booking.email,
          subject: `Booking Confirmed — ${booking.booking_ref}`,
          html: `<p>Dear ${booking.guest_name},</p><p>Your booking at Houseboat Canberra is confirmed.</p><p><strong>Reference:</strong> ${booking.booking_ref}</p><p><strong>Check-in:</strong> ${booking.check_in} <strong>Check-out:</strong> ${booking.check_out}</p><p><strong>Amount:</strong> ₹${booking.amount}</p><p>We look forward to welcoming you.</p><p>— Houseboat Canberra</p>`,
        });
      } catch {
        // Non-blocking
      }
    }
  }

  return NextResponse.json({ received: true });
}
