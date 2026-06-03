import { NextResponse } from "next/server";
import {
  getRooms,
  getSeasons,
  getMealPlans,
  getPropertyConfig,
  getBlockedDates,
  createBooking,
} from "@/lib/db";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN;

const FALLBACK_ROOMS = [
  { id: 1, name: "Deluxe Suite", units: 2, base_price: 8500 },
  { id: 2, name: "Premium Houseboat", units: 1, base_price: 12500 },
];
const FALLBACK_SEASONS = [
  { start_date: "2026-04-01", end_date: "2026-09-30", multiplier: 1.0 },
  { start_date: "2026-10-01", end_date: "2027-03-31", multiplier: 1.4 },
];
const FALLBACK_MEALS = [
  { code: "EP", name: "European Plan (Room only)", price: 0 },
  { code: "CP", name: "Continental Plan (Breakfast)", price: 650 },
  { code: "MAP", name: "Modified American Plan (Breakfast + Dinner)", price: 1800 },
  { code: "AP", name: "American Plan (All meals)", price: 3200 },
];

/**
 * GET /api/pms — returns all PMS data for the front-end.
 * Always returns data — falls back to hardcoded defaults when DB is unavailable.
 */
export async function GET() {
  let dbRooms: { id: number; name: string; units: number; base_price: number }[] = [];
  let dbSeasons: { start_date: string; end_date: string; multiplier: number }[] = [];
  let dbMeals: { code: string; name: string; price: number }[] = [];
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
  const roomsWithPrices = activeRooms.map((r) => {
    let multiplier = 1;
    for (const s of activeSeasons) {
      if (today >= s.start_date && today <= s.end_date) {
        multiplier = Number(s.multiplier);
        break;
      }
    }
    return {
      id: r.id,
      name: r.name,
      units: r.units,
      basePrice: r.base_price,
      currentPrice: Math.round(r.base_price * multiplier),
    };
  });

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
    const { guestName, phone, email, roomId, mealCode, adults, checkIn, checkOut, nights, amount } = body;

    if (!checkIn || !checkOut || !roomId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ref = "HBC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 900) + 100);

    // Always write to Neon first
    await createBooking({
      booking_ref: ref,
      guest_name: guestName || "Guest",
      phone: phone || "",
      email: email || "",
      room_id: parseInt(String(roomId)),
      meal_code: mealCode || "",
      adults: adults || 1,
      check_in: checkIn,
      check_out: checkOut,
      nights: nights || 1,
      amount: amount || 0,
      currency: "INR",
      stripe_payment_intent: "",
      status: "pending",
      invoice_url: "",
    }).catch((e) => console.error("[PMS] Neon write failed:", e));

    // Best-effort sync to Google Sheets via Apps Script
    if (APPS_SCRIPT_URL) {
      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: APPS_SCRIPT_TOKEN,
          guestName,
          phone,
          email,
          roomId,
          mealCode,
          adults,
          checkIn,
          checkOut,
          nights,
          amount,
          status: "pending",
        }),
      }).catch(() => {}); // fire-and-forget
    }

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
