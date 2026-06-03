import { NextResponse } from "next/server";
import {
  getRooms,
  getSeasons,
  getMealPlans,
  getPropertyConfig,
  getBlockedDates,
} from "@/lib/db";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN;

/**
 * GET /api/pms — returns all PMS data for the front-end.
 * Used by the store on page load to hydrate rooms, rates, seasons, etc.
 */
export async function GET() {
  try {
    const [rooms, seasons, mealPlans, property, blockedDates] =
      await Promise.all([
        getRooms(),
        getSeasons(),
        getMealPlans(),
        getPropertyConfig(),
        getBlockedDates(),
      ]);

    // Build blocked dates map
    const blocked: Record<number, string[]> = {};
    for (const b of blockedDates) {
      if (!blocked[b.room_id]) blocked[b.room_id] = [];
      blocked[b.room_id].push(b.date);
    }

    // Compute current price per room (apply seasonal multiplier)
    const today = new Date().toISOString().slice(0, 10);
    const roomsWithPrices = rooms.map((r) => {
      let multiplier = 1;
      for (const s of seasons) {
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
      property,
      rooms: roomsWithPrices,
      seasons,
      mealPlans,
      blockedDates: blocked,
    });
  } catch (error) {
    console.error("[PMS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load PMS data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pms — submits a booking enquiry.
 * Writes to Google Sheets Bookings tab via Apps Script.
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

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { ok: true, ref: "OFFLINE", message: "Booking recorded locally" }
      );
    }

    const res = await fetch(APPS_SCRIPT_URL, {
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
    });

    if (!res.ok) {
      throw new Error(`Apps Script: ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      ref: data.bookingId || "PENDING",
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
