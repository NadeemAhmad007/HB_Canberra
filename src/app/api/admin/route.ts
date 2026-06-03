import { NextResponse } from "next/server";
import {
  getAllBookings,
  getRooms,
  getSeasons,
  getMealPlans,
  getPropertyConfig,
  upsertRooms,
  replaceSeasons,
  replaceMealPlans,
  replacePropertyConfig,
  replaceBlockedDates,
  createBooking,
  getBlockedDates,
} from "@/lib/db";
import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(request: Request) {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return true; // no password configured = open access
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice(7) === password;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "bookings";

  try {
    switch (resource) {
      case "bookings": {
        const bookings = await getAllBookings();
        return NextResponse.json(bookings);
      }
      case "rooms": {
        const rooms = await getRooms();
        return NextResponse.json(rooms);
      }
      case "seasons": {
        const seasons = await getSeasons();
        return NextResponse.json(seasons);
      }
      case "meal-plans": {
        const meals = await getMealPlans();
        return NextResponse.json(meals);
      }
      case "property": {
        const config = await getPropertyConfig();
        return NextResponse.json(config);
      }
      case "blocked-dates": {
        const blocked = await getBlockedDates();
        return NextResponse.json(blocked);
      }
      case "guests": {
        const sql = getSql();
        const guests = await sql`SELECT * FROM guests ORDER BY updated_at DESC` as unknown;
        return NextResponse.json(guests);
      }
      case "notifications": {
        const sql = getSql();
        const notifications = await sql`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50` as unknown;
        return NextResponse.json(notifications);
      }
      case "settings": {
        const sql = getSql();
        const rows = await sql`SELECT * FROM settings ORDER BY key` as unknown as Array<{ key: string; value: string }>;
        const map: Record<string, string> = {};
        for (const r of rows) map[r.key] = r.value;
        return NextResponse.json(map);
      }
      case "dashboard": {
        const [bookings, rooms, seasons, meals, config] = await Promise.all([
          getAllBookings(),
          getRooms(),
          getSeasons(),
          getMealPlans(),
          getPropertyConfig(),
        ]);
        return NextResponse.json({ bookings, rooms, seasons, meals, config });
      }
      default:
        return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    const { resource, data } = body;

    switch (resource) {
      case "rooms": {
        await upsertRooms(data);
        return NextResponse.json({ ok: true });
      }
      case "seasons": {
        await replaceSeasons(data);
        return NextResponse.json({ ok: true });
      }
      case "meal-plans": {
        await replaceMealPlans(data);
        return NextResponse.json({ ok: true });
      }
      case "property": {
        await replacePropertyConfig(data);
        return NextResponse.json({ ok: true });
      }
      case "blocked-dates": {
        await replaceBlockedDates(data);
        return NextResponse.json({ ok: true });
      }
      case "booking-status": {
        const { bookingRef, status, stripePaymentIntent } = data;
        const sql = (await import("@/lib/db")).updateBookingStatus;
        await sql(bookingRef, status, stripePaymentIntent);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    if (body.resource === "booking") {
      const b = await createBooking(body.data);
      return NextResponse.json(b);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
