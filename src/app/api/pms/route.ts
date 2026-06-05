import { NextResponse } from "next/server";
import {
  getRooms,
  getSeasons,
  getMealPlans,
  getPropertyConfig,
  getBlockedDates,
  createBooking,
  getAvailableUnits,
  upsertRooms,
  replaceSeasons,
  replaceMealPlans,
  replacePropertyConfig,
  addActivityLog,
  upsertGuestFromBooking,
} from "@/lib/db";
import { brandedEmailHtml, sendEmail } from "@/lib/email";
import { notifyAdminNewBooking } from "@/lib/notify";

const FALLBACK_ROOMS = [
  { id: 1, name: "Deluxe Room", description: "Elegant lake-view room with handcrafted Kashmiri furnishings, overlooking the pristine waters of Dal Lake.", amenities: ["Lake View", "King Bed", "Ensuite Bathroom", "Heating", "Mini Bar", "WiFi", "Tea/Coffee Maker"], units: 2, base_price: 11500, max_adults: 2, max_children: 2, child_policy: "1 child above 10, 2 children below 10", active: true, status: "available", tour_url: "https://tour.panoee.net/iframe/690596e5eac32b09e73f0ee0" },
  { id: 3, name: "Family Suite", description: "Spacious two-bedroom suite ideal for families, with panoramic views of the Himalayan foothills.", amenities: ["Panoramic View", "2 Bedrooms", "Living Room", "Ensuite Bathroom", "Heating", "Mini Bar", "WiFi", "Kitchenette"], units: 1, base_price: 24500, max_adults: 4, max_children: 2, child_policy: "2 children below 12", active: true, status: "available", tour_url: "https://tour.panoee.net/iframe/690596e5eac32b09e73f0ee0" },
];
const FALLBACK_SEASONS = [
  { start_date: "2026-04-01", end_date: "2026-09-30", multiplier: 1.0 },
  { start_date: "2026-10-01", end_date: "2027-03-31", multiplier: 1.4 },
];
const FALLBACK_MEALS = [
  { code: "EP", name: "European Plan (Room only)", price: 0 },
  { code: "CP", name: "Continental Plan (Breakfast only)", price: 650 },
  { code: "MAP", name: "Modified American Plan (Breakfast + Dinner)", price: 1800 },
  { code: "AP", name: "American Plan (All meals)", price: 3200 },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get("checkIn");
  const checkOut = url.searchParams.get("checkOut");
  let dbRooms: any[] = [];
  let dbSeasons: any[] = [];
  let dbMeals: any[] = [];
  let dbProperty: Record<string, string> = {};
  let dbBlocked: { room_id: number; date: string }[] = [];
  let dbSettings: Record<string, string> = {};

  try {
    [dbRooms, dbSeasons, dbMeals, dbProperty, dbBlocked] = await Promise.all([
      (await import("@/lib/db")).getRooms().catch(() => []),
      getSeasons().catch(() => []),
      getMealPlans().catch(() => []),
      getPropertyConfig().catch(() => ({})),
      getBlockedDates().catch(() => []),
    ]);
    // Fetch settings separately (sql() is not a Promise, can't .catch chain)
    try {
      const sql = (await import("@/lib/db")).getSql;
      const db = sql();
      const rows = await db`SELECT * FROM settings ORDER BY key` as unknown as Array<{ key: string; value: string }>;
      for (const row of rows) dbSettings[row.key] = row.value;
    } catch { }
  } catch { }

  const useFallback = dbRooms.length === 0;

  if (useFallback) {
    try {
      await Promise.all([
        upsertRooms(FALLBACK_ROOMS.map(r => ({ ...r, amenities: JSON.stringify(r.amenities), active: r.active, status: r.status })) as any),
        replaceSeasons(FALLBACK_SEASONS),
        replaceMealPlans(FALLBACK_MEALS),
        replacePropertyConfig({ GST: "18", NAME: "Houseboat Canberra", ADDRESS: "Dal Lake, Srinagar", CURRENCY: "INR" }),
      ]);
    } catch { }
  }

  const activeRooms = useFallback ? FALLBACK_ROOMS : dbRooms;
  const activeSeasons = useFallback ? FALLBACK_SEASONS : dbSeasons;
  const activeMeals = useFallback ? FALLBACK_MEALS : dbMeals;
  const activeProperty = useFallback
    ? { GST: "18", NAME: "Houseboat Canberra", ADDRESS: "Dal Lake, Srinagar" }
    : dbProperty;

  const blocked: Record<number, string[]> = {};
  for (const b of dbBlocked) {
    if (!blocked[b.room_id]) blocked[b.room_id] = [];
    blocked[b.room_id].push(b.date);
  }

  const today = new Date().toISOString().slice(0, 10);
  const rateDate = checkIn || today;
  const roomsWithPrices = await Promise.all(activeRooms.map(async (r: any) => {
    let multiplier = 1;
    for (const s of activeSeasons) {
      if (rateDate >= s.start_date && rateDate <= s.end_date) {
        multiplier = Number(s.multiplier);
        break;
      }
    }
    let availableUnits = r.units;
    if (checkIn && checkOut && !useFallback) {
      availableUnits = await getAvailableUnits(r.id, checkIn, checkOut).catch(() => r.units);
    }
    return {
      id: r.id,
      name: r.name,
      description: r.description || "",
      amenities: typeof r.amenities === "string" ? JSON.parse(r.amenities) : (r.amenities || []),
      tourUrl: r.tour_url || "",
      units: r.units,
      availableUnits,
      basePrice: r.base_price,
      currentPrice: Math.round(r.base_price * multiplier),
      maxAdults: r.max_adults,
      maxChildren: r.max_children,
      childPolicy: r.child_policy,
    };
  }));

  return NextResponse.json({
    property: activeProperty,
    rooms: roomsWithPrices,
    seasons: activeSeasons,
    mealPlans: activeMeals,
    blockedDates: blocked,
    settings: dbSettings,
    _fallback: useFallback,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guestName, phone, email, roomId, mealCode, adults, children, units, checkIn, checkOut, nights, amount, notes, tcAccepted } = body;

    if (!checkIn || !checkOut || !roomId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const roomIdNum = parseInt(String(roomId));
    const available = await getAvailableUnits(roomIdNum, checkIn, checkOut).catch(() => 0);
    const unitsRequested = units || 1;
    if (available < unitsRequested) {
      return NextResponse.json(
        { error: `Only ${available} unit(s) available for the selected dates` }, { status: 409 }
      );
    }

    const ref = "HBC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 900) + 100);

    await createBooking({
      booking_ref: ref,
      guest_name: guestName || "Guest",
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
      currency: "INR",
      stripe_payment_intent: "",
      status: "pending",
      invoice_url: "",
      notes: notes || "",
      tc_accepted: !!tcAccepted,
    });

    // Activity log
    try {
      await addActivityLog("booking_created", "booking", ref, `Booking created via website: ${guestName}`, "website");
    } catch { }

    // Upsert guest
    try {
      await upsertGuestFromBooking({ name: guestName, email, phone, amount_spent: amount || 0 });
    } catch { }

    // Notify admin (in-app + email). Non-blocking, errors swallowed.
    try {
      const rooms = await getRooms().catch(() => []);
      const roomName = (rooms as any[]).find((r: any) => r.id === roomIdNum)?.name || "Selected Room";
      await notifyAdminNewBooking({
        ref,
        guestName: guestName || "Guest",
        guestEmail: email,
        guestPhone: phone,
        roomName,
        checkIn,
        checkOut,
        nights: nights || 1,
        amount: amount || 0,
        currency: "INR",
        source: "website",
      });
    } catch { }

    // Send confirmation email async (non-blocking)
    if (email && process.env.RESEND_API_KEY) {
      try {
        const rooms = await getRooms().catch(() => []);
        const roomName = (rooms as any[]).find((r: any) => r.id === roomIdNum)?.name || "Selected Room";
        const bodyHtml = `
          <h2 style="font-size:20px;font-weight:400;color:#fff;margin:0 0 6px">Thank you, ${guestName}!</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;margin:0 0 24px">Your booking enquiry has reached the reservations desk at <strong style="color:#fff">Houseboat Canberra</strong>. We will confirm your stay within the hour.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;width:40%">Reference</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#C8A86B;font-family:monospace">${ref}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Room</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${roomName} × ${unitsRequested}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-in</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${checkIn}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-out</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${checkOut}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Guests</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${adults} adults, ${children} children</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Total</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff"><strong>₹${(amount || 0).toLocaleString()}</strong></td></tr>
          </table>
          <p style="font-size:13px;color:rgba(255,255,255,0.55);margin:20px 0 0">If you have any questions, reply to this email or contact us directly. We look forward to welcoming you aboard.</p>
        `;
        await sendEmail({
          to: email,
          subject: `Booking Enquiry Received — ${ref}`,
          html: brandedEmailHtml(bodyHtml, {}),
        });
      } catch { }
    }

    return NextResponse.json({
      ok: true,
      ref,
      message: "Your request has reached the reservations desk. You will hear from us within the hour.",
    });
  } catch (error) {
    console.error("[PMS] POST error:", error);
    return NextResponse.json({ error: "Failed to submit booking" }, { status: 500 });
  }
}
