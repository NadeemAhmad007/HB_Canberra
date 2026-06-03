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
} from "@/lib/db";

const FALLBACK_ROOMS = [
  { id: 1, name: "Deluxe Room", units: 2, base_price: 11500, max_adults: 2, max_children: 2, child_policy: "1 child above 10, 2 children below 10" },
  { id: 3, name: "Family Suite", units: 1, base_price: 24500, max_adults: 4, max_children: 2, child_policy: "2 children below 12" },
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

/**
 * GET /api/pms — returns all PMS data for the front-end.
 * Always returns data — falls back to hardcoded defaults when DB is unavailable.
 * Optional query params: checkIn, checkOut — returns availableUnits per room.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get("checkIn");
  const checkOut = url.searchParams.get("checkOut");
  let dbRooms: (typeof FALLBACK_ROOMS)[number][] = [];
  let dbSeasons: (typeof FALLBACK_SEASONS)[number][] = [];
  let dbMeals: (typeof FALLBACK_MEALS)[number][] = [];
  let dbProperty: Record<string, string> = {};
  let dbBlocked: { room_id: number; date: string }[] = [];

  try {
    [dbRooms, dbSeasons, dbMeals, dbProperty, dbBlocked] = await Promise.all([
      getRooms().catch(() => []),
      getSeasons().catch(() => []),
      getMealPlans().catch(() => []),
      getPropertyConfig().catch(() => ({})),
      getBlockedDates().catch(() => []),
    ]);
  } catch {
    // all failed — use fallback
  }

  const useFallback = dbRooms.length === 0;

  // Auto-seed if DB is empty — first request populates data
  if (useFallback) {
    try {
      await Promise.all([
        upsertRooms(FALLBACK_ROOMS),
        replaceSeasons(FALLBACK_SEASONS),
        replaceMealPlans(FALLBACK_MEALS),
        replacePropertyConfig({ GST: "18", NAME: "Houseboat Canberra", ADDRESS: "Dal Lake, Srinagar", CURRENCY: "INR" }),
      ]);
    } catch {
      // seed failed, stay on fallback
    }
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
  const roomsWithPrices = await Promise.all(activeRooms.map(async (r) => {
    let multiplier = 1;
    for (const s of activeSeasons) {
      if (today >= s.start_date && today <= s.end_date) {
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
    _fallback: useFallback,
  });
}

/**
 * POST /api/pms — submits a booking enquiry.
 * Writes to Neon database first, then attempts to sync to Google Sheets.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guestName, phone, email, roomId, mealCode, adults, children, units, checkIn, checkOut, nights, amount } = body;

    if (!checkIn || !checkOut || !roomId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ref = "HBC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 900) + 100);

    // Save to Neon
    await createBooking({
      booking_ref: ref,
      guest_name: guestName || "Guest",
      phone: phone || "",
      email: email || "",
      room_id: parseInt(String(roomId)),
      meal_code: mealCode || "",
      adults: adults || 1,
      children: children || 0,
      units: units || 1,
      check_in: checkIn,
      check_out: checkOut,
      nights: nights || 1,
      amount: amount || 0,
      currency: "INR",
      stripe_payment_intent: "",
      status: "pending",
      invoice_url: "",
    });

    return NextResponse.json({
      ok: true,
      ref,
      message:
        "Your request has reached the reservations desk. You will hear from us within the hour.",
    });
  } catch (error) {
    console.error("[PMS] POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit booking" },
      { status: 500 }
    );
  }
}
