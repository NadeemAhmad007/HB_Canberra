import { NextResponse } from "next/server";
import { getBookingByRef, getTotalPaid, getPaymentsForBooking, getInvoiceByBooking } from "@/lib/db";
import { checkRateLimit } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const forwarded = request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`booking-status:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const booking = await getBookingByRef(ref).catch(() => null);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const payments = await getPaymentsForBooking(ref).catch(() => []);
  const paid = await getTotalPaid(ref).catch(() => 0);
  const invoice = await getInvoiceByBooking(ref).catch(() => null);

  return NextResponse.json({
    booking: {
      booking_ref: booking.booking_ref,
      guest_name: booking.guest_name,
      check_in: typeof booking.check_in === "string" ? booking.check_in : booking.check_in?.toISOString?.()?.slice(0, 10),
      check_out: typeof booking.check_out === "string" ? booking.check_out : booking.check_out?.toISOString?.()?.slice(0, 10),
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      units: booking.units,
      amount: booking.amount,
      amount_paid: paid || booking.amount_paid || 0,
      currency: booking.currency,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: booking.created_at,
    },
    invoice: invoice ? {
      invoice_no: invoice.invoice_no,
      status: invoice.status,
      total: invoice.total,
    } : null,
  });
}
