import { NextResponse } from "next/server";
import { getBookingByRef, getTotalPaid, getPaymentsForBooking, getInvoiceByBooking } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const booking = await getBookingByRef(ref).catch(() => null);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const payments = await getPaymentsForBooking(ref).catch(() => []);
  const paid = await getTotalPaid(ref).catch(() => 0);
  const invoice = await getInvoiceByBooking(ref).catch(() => null);

  return NextResponse.json({
    booking: {
      booking_ref: booking.booking_ref,
      guest_name: booking.guest_name,
      email: booking.email,
      phone: booking.phone,
      room_name: booking.room_name,
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
      payment_gateway: booking.payment_gateway,
      checkin_at: booking.checkin_at,
      checkout_at: booking.checkout_at,
      notes: booking.notes,
      created_at: booking.created_at,
    },
    payments,
    invoice: invoice ? {
      id: invoice.id,
      invoice_no: invoice.invoice_no,
      status: invoice.status,
      total: invoice.total,
      paid_at: invoice.paid_at,
    } : null,
  });
}
