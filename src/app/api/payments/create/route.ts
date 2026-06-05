import { NextResponse } from "next/server";
import { getBankDetails } from "@/lib/payments";
import { createBooking, getAvailableUnits, addActivityLog, upsertGuestFromBooking } from "@/lib/db";
import { brandedEmailHtml, sendEmail } from "@/lib/email";
import { notifyAdminNewBooking } from "@/lib/notify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guestName, phone, email, roomId, mealCode, adults, children, units, checkIn, checkOut, nights, amount, currency, notes, tcAccepted } = body;

    if (!checkIn || !checkOut || !roomId || !guestName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const roomIdNum = parseInt(String(roomId));
    const unitsRequested = units || 1;
    const currencyCode = (currency || "INR").toUpperCase();

    const available = await getAvailableUnits(roomIdNum, checkIn, checkOut).catch(() => 0);
    if (available < unitsRequested) {
      return NextResponse.json({ error: `Only ${available} unit(s) available` }, { status: 409 });
    }

    const ref = "HBC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 900) + 100);

    await createBooking({
      booking_ref: ref,
      guest_name: guestName,
      phone: phone || "",
      email: email || "",
      room_id: roomIdNum,
      meal_code: mealCode || "",
      adults: adults || 1,
      children: children || 0,
      units: unitsRequested,
      check_in: checkIn,
      check_out: checkOut,
      nights: nights || 1,
      amount: amount || 0,
      currency: currencyCode,
      stripe_payment_intent: "",
      status: "pending",
      invoice_url: "",
      notes: notes || "",
      tc_accepted: !!tcAccepted,
    });

    // Fetch settings for bank details
    let settings: Record<string, string> = {};
    try {
      const sql = (await import("@/lib/db")).getSql;
      const db = sql();
      const rows = await db`SELECT * FROM settings ORDER BY key` as unknown as Array<{ key: string; value: string }>;
      for (const r of rows) settings[r.key] = r.value;
    } catch {}

    const bank = getBankDetails(settings);

    try {
      await addActivityLog("booking_created", "booking", ref, `Booking created via website: ${guestName}`, "website");
    } catch {}

    try {
      await upsertGuestFromBooking({ name: guestName, email, phone, amount_spent: amount || 0 });
    } catch {}

    // Notify admin (in-app + email). Non-blocking, errors swallowed.
    try {
      const rooms = await (await import("@/lib/db")).getRooms().catch(() => []);
      const roomName = (rooms as any[]).find((r: any) => r.id === roomIdNum)?.name || "Selected Room";
      await notifyAdminNewBooking({
        ref,
        guestName,
        guestEmail: email,
        guestPhone: phone,
        roomName,
        checkIn,
        checkOut,
        nights: nights || 1,
        amount: amount || 0,
        currency: currencyCode,
        source: "website",
      });
    } catch {}

    // Send confirmation email with bank details (non-blocking)
    if (email && process.env.RESEND_API_KEY) {
      try {
        const rooms = await (await import("@/lib/db")).getRooms().catch(() => []);
        const roomName = (rooms as any[]).find((r: any) => r.id === roomIdNum)?.name || "Selected Room";
        const bodyHtml = `
          <h2 style="font-size:20px;font-weight:400;color:#fff;margin:0 0 6px">Thank you, ${guestName}!</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;margin:0 0 24px">Your booking at <strong style="color:#fff">Houseboat Canberra</strong> has been received. Please transfer the amount to confirm your stay.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;width:40%">Reference</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#C8A86B;font-family:monospace">${ref}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Room</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${roomName} × ${unitsRequested}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-in</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${checkIn}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-out</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${checkOut}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Amount</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff"><strong>₹${(amount || 0).toLocaleString()}</strong></td></tr>
          </table>
          <div style="background:rgba(200,168,107,0.08);border:1px solid rgba(200,168,107,0.15);border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="font-size:12px;color:#C8A86B;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px">Bank Transfer Details</h3>
            <p style="font-size:13px;margin:0;line-height:1.8;color:rgba(255,255,255,0.75)">
              <strong style="color:#fff">Bank:</strong> ${bank.bankName}<br>
              <strong style="color:#fff">Account Name:</strong> ${bank.accountName}<br>
              <strong style="color:#fff">Account No:</strong> ${bank.accountNumber}<br>
              <strong style="color:#fff">IFSC:</strong> ${bank.ifsc}${bank.upiId ? `<br><strong style="color:#fff">UPI:</strong> ${bank.upiId}` : ""}
            </p>
          </div>
          <p style="font-size:13px;color:rgba(255,255,255,0.55);margin:20px 0 0">Once transferred, please notify us so we can confirm your stay.</p>
        `;
        await sendEmail({
          to: email,
          subject: `Booking Enquiry Received — ${ref}`,
          html: brandedEmailHtml(bodyHtml, {}),
        });
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      ref,
      amount: amount || 0,
      currency: currencyCode,
      bank,
    });
  } catch (error) {
    console.error("[Payments] Create error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
