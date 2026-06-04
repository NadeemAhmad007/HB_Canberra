import { NextResponse } from "next/server";
import { getBankDetails } from "@/lib/payments";
import { createBooking, getAvailableUnits, addActivityLog } from "@/lib/db";

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

    // Send confirmation email with bank details (non-blocking)
    if (email) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
        const rooms = await (await import("@/lib/db")).getRooms().catch(() => []);
        const roomName = (rooms as any[]).find((r: any) => r.id === roomIdNum)?.name || "Selected Room";
        await resend.emails.send({
          from: `Houseboat Canberra <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
          to: email,
          subject: `Booking Enquiry Received — ${ref}`,
          html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0A0D0C;color:#fff;padding:48px 40px;border-radius:12px">
            <h2 style="font-size:22px;font-weight:400;color:#C8A86B;margin:0 0 8px">Thank you, ${guestName}!</h2>
            <p style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 24px">Your booking at <strong>Houseboat Canberra</strong> has been received. Please transfer the amount to confirm your stay.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0">
              <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)">Reference</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:13px;color:#C8A86B;font-family:monospace"><strong>${ref}</strong></td></tr>
              <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)">Room</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:13px">${roomName} × ${unitsRequested}</td></tr>
              <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)">Check-in</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:13px">${checkIn}</td></tr>
              <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)">Check-out</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:13px">${checkOut}</td></tr>
              <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.5)">Amount</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,0.1);font-size:13px"><strong>₹${(amount || 0).toLocaleString()}</strong></td></tr>
            </table>
            <div style="background:rgba(200,168,107,0.1);border:1px solid rgba(200,168,107,0.2);border-radius:12px;padding:20px;margin:24px 0">
              <h3 style="font-size:13px;color:#C8A86B;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px">Bank Transfer Details</h3>
              <p style="font-size:13px;margin:0;line-height:1.8">
                <strong>Bank:</strong> ${bank.bankName}<br>
                <strong>Account Name:</strong> ${bank.accountName}<br>
                <strong>Account No:</strong> ${bank.accountNumber}<br>
                <strong>IFSC:</strong> ${bank.ifsc}${bank.upiId ? `<br><strong>UPI:</strong> ${bank.upiId}` : ""}
              </p>
            </div>
            <p style="font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin:32px 0 0">Houseboat Canberra — Dal Lake, Srinagar</p>
          </div>`,
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
