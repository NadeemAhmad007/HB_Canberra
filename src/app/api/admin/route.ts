import { NextResponse } from "next/server";

function isMissingColumnError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("not found"));
}

function isMissingTableError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

function formatDate(d: any): string {
  if (!d) return "";
  const date = new Date(d);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(d).slice(0, 10);
}

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
  updateBookingStatus,
  bulkUpdateBookingStatus,
  getAvailableUnits,
  getInvoiceByBooking,
  getBookingByRef,
  getSettings,
  getTaxRate,
  getEmailTemplate,
  recordPayment,
  upsertGuestFromBooking,
  transitionBookingStatus,
} from "@/lib/db";
import { applyTemplate, sendEmail, settingsFromMap, brandedEmailHtml } from "@/lib/email";
import { neon } from "@neondatabase/serverless";
import { notifyAdminNewBooking } from "@/lib/notify";

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
        const trans = await transitionBookingStatus(bookingRef, status);
        if (!trans.ok) {
          return NextResponse.json({ error: trans.reason || "Invalid transition" }, { status: 409 });
        }
        await updateBookingStatus(bookingRef, status, stripePaymentIntent);
        try { await addActivityLog("booking_status", "booking", bookingRef, `Status changed to ${status}`); } catch (e) { console.error("[admin] activity log failed:", e); }

        // Auto-create invoice + send confirmation email when status → confirmed
        if (status === "confirmed") {
          const booking = await getBookingByRef(bookingRef);
          if (booking) {
            let invoiceId: number | null = null;
            try {
              const existing = await getInvoiceByBooking(bookingRef);
              if (!existing) {
                const settings = await getSettings();
                const taxRate = (await getTaxRate()) / 100;
                const subtotal = booking.amount;
                const tax = Math.round(subtotal * taxRate);
                const total = subtotal + tax;
                const items = [
                  { description: `${booking.room_name || "Room"} × ${booking.units} unit(s) × ${booking.nights} night(s)`, amount: Math.round(subtotal / Math.max(1, booking.nights)), qty: booking.units * booking.nights },
                ];
                const inv = await createInvoice({
                  booking_ref: bookingRef,
                  invoice_no: "INV-" + Date.now(),
                  guest_name: booking.guest_name,
                  items, subtotal, tax, total,
                  currency: booking.currency || "INR",
                  status: "sent",
                });
                invoiceId = inv?.id ?? null;
              }
            } catch (e) { console.error("[admin] auto-invoice on status-confirmed failed:", e); }

            if (booking.email) {
              try {
                const template = await getEmailTemplate("booking_confirmed");
                const settings = await getSettings();
                const info = settingsFromMap(settings);
                if (template) {
                  const settingRows = await getSettings();
                  const address = settingRows.hotel_address || "Gate no 13, Dal Lake Boulevard Road, Srinagar, 190001, Jammu & Kashmir, India";
                  const vars: Record<string, string> = {
                    guest_name: booking.guest_name,
                    booking_ref: booking.booking_ref,
                    check_in: formatDate(booking.check_in),
                    check_out: formatDate(booking.check_out),
                    room_name: booking.room_name || "Room",
                    amount: String(booking.amount || 0),
                    checkin_time: settingRows.checkin_time || "14:00",
                    checkout_time: settingRows.checkout_time || "11:00",
                    property_email: info.propertyEmail,
                    property_phone: info.propertyPhone,
                    property_website: info.propertyWebsite,
                    property_address: address,
                    property_name: info.propertyName,
                  };
                  const bodyHtml = applyTemplate(template.body, vars).replace(/\n/g, "<br>");
                  const html = brandedEmailHtml(bodyHtml, { ...info, propertyAddress: address });
                  await sendEmail({ to: booking.email, subject: template.subject, html });
                }
              } catch (e) { console.error("[admin] confirmation email on status-confirmed failed:", e); }
            }
          }
        }

        return NextResponse.json({ ok: true });
      }
      case "bulk-booking-status": {
        const { refs, status } = data;
        const allowed: string[] = [];
        const rejected: { ref: string; reason: string }[] = [];
        for (const ref of refs) {
          const trans = await transitionBookingStatus(ref, status);
          if (trans.ok) allowed.push(ref);
          else rejected.push({ ref, reason: trans.reason || "Invalid transition" });
        }
        if (allowed.length > 0) await bulkUpdateBookingStatus(allowed, status);
        try { await addActivityLog("bulk_booking_status", "booking", allowed.join(","), `Bulk status change to ${status} (${allowed.length} bookings, ${rejected.length} rejected)`); } catch (e) { console.error("[admin] activity log failed:", e); }
        return NextResponse.json({ ok: true, applied: allowed.length, rejected });
      }
      case "checkin": {
        const trans = await transitionBookingStatus(data.bookingRef, "checked-in");
        if (!trans.ok) {
          return NextResponse.json({ error: trans.reason || "Invalid transition" }, { status: 409 });
        }
        const sql = (await import("@/lib/db")).getSql;
        const db = sql();
        await db`UPDATE bookings SET status = 'checked-in', checkin_at = now(), updated_at = now() WHERE booking_ref = ${data.bookingRef}`;
        try { await addActivityLog("checkin", "booking", data.bookingRef, `Guest checked in`); } catch (e) { console.error("[admin] activity log failed:", e); }
        return NextResponse.json({ ok: true });
      }
      case "checkout": {
        const trans = await transitionBookingStatus(data.bookingRef, "checked-out");
        if (!trans.ok) {
          return NextResponse.json({ error: trans.reason || "Invalid transition" }, { status: 409 });
        }
        const sql = (await import("@/lib/db")).getSql;
        const db = sql();
        const bookingRow = await db`SELECT room_id, guest_name FROM bookings WHERE booking_ref = ${data.bookingRef}` as unknown as Array<{ room_id: number; guest_name: string }>;
        await db`UPDATE bookings SET status = 'checked-out', checkout_at = now(), updated_at = now() WHERE booking_ref = ${data.bookingRef}`;
        try { await addActivityLog("checkout", "booking", data.bookingRef, `Guest checked out`); } catch (e) { console.error("[admin] activity log failed:", e); }
        // Auto-create housekeeping task for that room/unit
        try {
          if (bookingRow.length > 0) {
            const r = bookingRow[0];
            await db`INSERT INTO housekeeping_tasks (room_id, task_type, status, assigned_to, notes, scheduled_date)
                     VALUES (${r.room_id}, 'clean', 'pending', '', ${`Auto: post-checkout for ${r.guest_name}`}, CURRENT_DATE)`;
          }
        } catch (e) { console.error("[admin] auto-housekeeping failed:", e); }
        return NextResponse.json({ ok: true });
      }
      case "record-payment": {
        const { bookingRef, amount, method, reference, notes } = data;
        if (!bookingRef || !amount) {
          return NextResponse.json({ error: "bookingRef and amount required" }, { status: 400 });
        }
        const booking = await getBookingByRef(bookingRef);
        if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        try {
          await recordPayment({ booking_ref: bookingRef, amount, method, reference, notes, recorded_by: "admin" });
        } catch (e) {
          if (isMissingTableError(e) || isMissingColumnError(e)) {
            console.warn("[admin] recordPayment skipped (table/column missing):", e instanceof Error ? e.message : e);
          } else {
            throw e;
          }
        }
        const newPaid = (booking.amount_paid || 0) + amount;
        const newStatus = newPaid >= booking.amount ? "paid" : "partial";
        const sql = getSql();
        try {
          await sql`UPDATE bookings SET payment_status = ${newStatus}, payment_gateway = COALESCE(NULLIF(${method || ""}, ''), payment_gateway), updated_at = now() WHERE booking_ref = ${bookingRef}`;
        } catch (e) {
          if (!isMissingColumnError(e)) throw e;
          try { await sql`UPDATE bookings SET updated_at = now() WHERE booking_ref = ${bookingRef}`; } catch {}
        }
        try { await addActivityLog("payment_recorded", "booking", bookingRef, `Payment of ₹${amount} recorded (${method || "bank"})${reference ? ` ref ${reference}` : ""}`); } catch (e) { console.error("[admin] activity log failed:", e); }
        try { await upsertGuestFromBooking({ name: booking.guest_name, email: booking.email, phone: booking.phone, amount_spent: amount }); } catch (e) { console.error("[admin] guest upsert failed:", e); }
        return NextResponse.json({ ok: true, amount_paid: newPaid, payment_status: newStatus });
      }
      case "checkin-id-proof": {
        const { bookingRef, idProof } = data;
        if (!bookingRef) return NextResponse.json({ error: "bookingRef required" }, { status: 400 });
        const sql = getSql();
        await sql`UPDATE bookings SET id_proof = ${idProof || ""}, updated_at = now() WHERE booking_ref = ${bookingRef}`;
        try { await addActivityLog("id_proof_captured", "booking", bookingRef, `ID proof captured`); } catch (e) { console.error("[admin] activity log failed:", e); }
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
        const { bookingRef, amount, method, reference } = data;
        const sql = getSql();

        const booking = await getBookingByRef(bookingRef);
        if (!booking) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (booking.status === "cancelled") {
          return NextResponse.json({ error: "Cannot mark paid: booking is cancelled" }, { status: 409 });
        }
        console.log("[admin] mark-paid start", { bookingRef, currentStatus: booking.status });

        let trans: { ok: boolean; reason?: string; from?: string } = { ok: true, from: booking.status };
        try {
          trans = await transitionBookingStatus(bookingRef, "confirmed");
          if (!trans.ok && trans.from !== "confirmed") {
            return NextResponse.json({ error: trans.reason || "Invalid transition" }, { status: 409 });
          }
        } catch (e) { console.error("[admin] mark-paid transition check failed:", (e as Error).message); }

        if (trans.ok) {
          try {
            const available = await getAvailableUnits(booking.room_id, booking.check_in, booking.check_out);
            const currentBooked = await sql`SELECT COALESCE(SUM(units), 0) AS u FROM bookings WHERE room_id = ${booking.room_id} AND booking_ref != ${bookingRef} AND check_in < ${booking.check_out} AND check_out > ${booking.check_in} AND status != 'cancelled'` as unknown as Array<{ u: string }>;
            const otherBooked = parseInt(currentBooked[0]?.u) || 0;
            if (otherBooked + booking.units > available + booking.units) {
              return NextResponse.json({ error: "Overbooking prevented: no units available for these dates" }, { status: 409 });
            }
          } catch (e) { console.error("[admin] mark-paid availability check failed:", (e as Error).message); }
        }

        const payAmount = amount || booking.amount - (booking.amount_paid || 0);
        const payMethod = method || "bank";

        try {
          await sql`UPDATE bookings SET payment_status = 'paid', payment_gateway = ${payMethod}, status = 'confirmed', updated_at = now() WHERE booking_ref = ${bookingRef}`;
        } catch (e) {
          if (isMissingColumnError(e)) {
            try {
              await sql`UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE booking_ref = ${bookingRef}`;
            } catch (e2) {
              throw e2;
            }
          } else {
            throw e;
          }
        }

        try {
          await recordPayment({ booking_ref: bookingRef, amount: payAmount, method: payMethod, reference: reference || "", recorded_by: "admin" });
        } catch (e) { console.error("[admin] recordPayment failed (table missing?):", (e as Error).message); }

        try { await upsertGuestFromBooking({ name: booking.guest_name, email: booking.email, phone: booking.phone, amount_spent: payAmount }); } catch (e) { console.error("[admin] guest upsert failed:", e); }

        try { await addActivityLog("bank_transfer_confirmed", "booking", bookingRef, `Bank transfer confirmed by admin`); } catch (e) { console.error("[admin] activity log failed:", e); }

        // Auto-create invoice
        let invoiceId: number | null = null;
        try {
          const existing = await getInvoiceByBooking(bookingRef);
          if (!existing) {
            const settings = await getSettings();
            const taxRate = (await getTaxRate()) / 100;
            const subtotal = booking.amount;
            const tax = Math.round(subtotal * taxRate);
            const total = subtotal + tax;
            const items = [
              { description: `${booking.room_name || "Room"} × ${booking.units} unit(s) × ${booking.nights} night(s)`, amount: Math.round(subtotal / Math.max(1, booking.nights)), qty: booking.units * booking.nights },
            ];
            const inv = await createInvoice({
              booking_ref: bookingRef,
              invoice_no: "INV-" + Date.now(),
              guest_name: booking.guest_name,
              items, subtotal, tax, total,
              currency: booking.currency || "INR",
              status: "sent",
            });
            invoiceId = inv?.id ?? null;
          }
        } catch (e) { console.error("[admin] auto-invoice failed:", e); }

        // Send booking_confirmed email
        if (booking.email) {
          try {
            const template = await getEmailTemplate("booking_confirmed");
            const settings = await getSettings();
            const info = settingsFromMap(settings);
            if (template) {
              const settingRows = await getSettings();
              const address = settingRows.hotel_address || "Gate no 13, Dal Lake Boulevard Road, Srinagar, 190001, Jammu & Kashmir, India";
              const vars: Record<string, string> = {
                guest_name: booking.guest_name,
                booking_ref: booking.booking_ref,
                check_in: formatDate(booking.check_in),
                check_out: formatDate(booking.check_out),
                room_name: booking.room_name || "Room",
                amount: String(booking.amount || 0),
                checkin_time: settingRows.checkin_time || "14:00",
                checkout_time: settingRows.checkout_time || "11:00",
                property_email: info.propertyEmail,
                property_phone: info.propertyPhone,
                property_website: info.propertyWebsite,
                property_address: address,
                property_name: info.propertyName,
              };
              const bodyHtml = applyTemplate(template.body, vars).replace(/\n/g, "<br>");
              const html = brandedEmailHtml(bodyHtml, { ...info, propertyAddress: address });
              await sendEmail({ to: booking.email, subject: template.subject, html });
            }
          } catch (e) { console.error("[admin] confirmation email failed:", e); }
        }

        return NextResponse.json({ ok: true, invoiceId });
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
    const stack = error instanceof Error ? error.stack : "";
    console.error("[admin PUT] error:", msg, "\nStack:", stack);
    return NextResponse.json({ error: msg, stack }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    if (body.resource === "booking") {
      const b = await createBooking(body.data);
      try {
        const d = body.data || {};
        const rooms = await getRooms().catch(() => []);
        const roomName = (rooms as any[]).find((r: any) => r.id === d.room_id)?.name || "Room";
        await notifyAdminNewBooking({
          ref: b.booking_ref || d.booking_ref || "—",
          guestName: d.guest_name || "Guest",
          guestEmail: d.email,
          guestPhone: d.phone,
          roomName,
          checkIn: d.check_in,
          checkOut: d.check_out,
          nights: d.nights,
          amount: d.amount,
          currency: d.currency,
          source: "admin",
        });
      } catch (e) { console.error("[admin] booking notify failed:", e instanceof Error ? e.message : e); }
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
