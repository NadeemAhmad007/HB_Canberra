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
  addActivityLog,
  getActivityLog,
  getUsers,
  createUser,
  updateUser,
  getEmailTemplates,
  updateEmailTemplate,
  getHousekeepingTasks,
  upsertHousekeepingTask,
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  bulkUpdateBookingStatus,
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
  if (!password) return true;
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
      case "activity": {
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const log = await getActivityLog(limit);
        return NextResponse.json(log);
      }
      case "users": {
        const users = await getUsers();
        return NextResponse.json(users);
      }
      case "email-templates": {
        const templates = await getEmailTemplates();
        return NextResponse.json(templates);
      }
      case "housekeeping": {
        const date = url.searchParams.get("date") || undefined;
        const tasks = await getHousekeepingTasks(date);
        return NextResponse.json(tasks);
      }
      case "invoices": {
        const invoices = await getInvoices();
        return NextResponse.json(invoices);
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
        await updateBookingStatus(bookingRef, status, stripePaymentIntent);
        await addActivityLog("booking_status", "booking", bookingRef, `Status changed to ${status}`);
        return NextResponse.json({ ok: true });
      }
      case "bulk-booking-status": {
        const { refs, status } = data;
        await bulkUpdateBookingStatus(refs, status);
        await addActivityLog("bulk_booking_status", "booking", refs.join(","), `Bulk status change to ${status} (${refs.length} bookings)`);
        return NextResponse.json({ ok: true });
      }
      case "checkin": {
        const sql = (await import("@/lib/db")).getSql;
        const db = sql();
        await db`UPDATE bookings SET status = 'checked-in', checkin_at = now(), updated_at = now() WHERE booking_ref = ${data.bookingRef}`;
        await addActivityLog("checkin", "booking", data.bookingRef, `Guest checked in`);
        return NextResponse.json({ ok: true });
      }
      case "checkout": {
        const sql = (await import("@/lib/db")).getSql;
        const db = sql();
        await db`UPDATE bookings SET status = 'checked-out', checkout_at = now(), updated_at = now() WHERE booking_ref = ${data.bookingRef}`;
        await addActivityLog("checkout", "booking", data.bookingRef, `Guest checked out`);
        return NextResponse.json({ ok: true });
      }
      case "user": {
        await updateUser(data.id, data);
        return NextResponse.json({ ok: true });
      }
      case "email-template": {
        await updateEmailTemplate(data.id, data);
        return NextResponse.json({ ok: true });
      }
      case "housekeeping": {
        await upsertHousekeepingTask(data);
        return NextResponse.json({ ok: true });
      }
      case "invoice-status": {
        await updateInvoiceStatus(data.id, data.status);
        return NextResponse.json({ ok: true });
      }
      case "mark-paid": {
        const { bookingRef } = data;
        const sql = getSql();
        await sql`UPDATE bookings SET payment_status = 'paid', payment_gateway = 'bank', status = 'confirmed', updated_at = now() WHERE booking_ref = ${bookingRef}`;
        await addActivityLog("bank_transfer_confirmed", "booking", bookingRef, `Bank transfer confirmed by admin`);
        return NextResponse.json({ ok: true });
      }
      case "settings": {
        const sv = getSql();
        for (const [key, value] of Object.entries(data)) {
          await sv`INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${String(value)}, now()) ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = now()`;
        }
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
    if (body.resource === "user") {
      const user = await createUser(body.data);
      return NextResponse.json(user);
    }
    if (body.resource === "invoice") {
      const inv = await createInvoice(body.data);
      return NextResponse.json(inv);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
