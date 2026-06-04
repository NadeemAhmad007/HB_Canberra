import { Pool } from "@neondatabase/serverless";
import { neon } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ── Property Config ────────────────────────────────────────────────────

export async function getPropertyConfig() {
  const res = await query("SELECT key, value FROM property_config");
  const map: Record<string, string> = {};
  for (const row of res.rows) map[row.key] = row.value;
  return map;
}

export async function replacePropertyConfig(config: Record<string, string>) {
  for (const [key, value] of Object.entries(config)) {
    await query(
      `INSERT INTO property_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  }
}

// ── Settings ───────────────────────────────────────────────────────────

export async function getSettings() {
  const res = await query("SELECT key, value FROM settings ORDER BY key");
  const map: Record<string, string> = {};
  for (const row of res.rows) map[row.key] = row.value;
  return map;
}

// ── Rooms ──────────────────────────────────────────────────────────────

export async function getRooms() {
  const res = await query(`
    SELECT id, name, units, base_price, description, amenities, tour_url,
           max_adults, max_children, child_policy, active, status
    FROM rooms WHERE active = true ORDER BY id
  `);
  return res.rows as any[];
}

export async function getAllRooms() {
  const res = await query(
    "SELECT id, name, units, base_price, description, amenities, tour_url, max_adults, max_children, child_policy, active, status FROM rooms ORDER BY id"
  );
  return res.rows as any[];
}

export async function upsertRooms(rooms: any[]) {
  for (const r of rooms) {
    await query(
      `INSERT INTO rooms (id, name, units, base_price, description, amenities, tour_url, max_adults, max_children, child_policy, active, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, units = EXCLUDED.units, base_price = EXCLUDED.base_price,
         description = EXCLUDED.description, amenities = EXCLUDED.amenities,
         tour_url = EXCLUDED.tour_url, max_adults = EXCLUDED.max_adults,
         max_children = EXCLUDED.max_children, child_policy = EXCLUDED.child_policy,
         active = EXCLUDED.active, status = EXCLUDED.status, updated_at = now()`,
      [r.id, r.name, r.units, r.base_price, r.description || "", r.amenities ? JSON.stringify(r.amenities) : "[]", r.tour_url || "", r.max_adults ?? 2, r.max_children ?? 0, r.child_policy || "", r.active ?? true, r.status || "available"]
    );
  }
}

// ── Seasons ────────────────────────────────────────────────────────────

export async function getSeasons() {
  const res = await query("SELECT id, start_date, end_date, multiplier FROM seasons ORDER BY start_date");
  return res.rows as any[];
}

export async function replaceSeasons(seasons: any[]) {
  await query("DELETE FROM seasons");
  for (const s of seasons) {
    await query(
      "INSERT INTO seasons (start_date, end_date, multiplier) VALUES ($1, $2, $3)",
      [s.start_date, s.end_date, s.multiplier]
    );
  }
}

// ── Meal Plans ─────────────────────────────────────────────────────────

export async function getMealPlans() {
  const res = await query("SELECT code, name, price FROM meal_plans ORDER BY code");
  return res.rows as any[];
}

export async function replaceMealPlans(plans: any[]) {
  await query("DELETE FROM meal_plans");
  for (const m of plans) {
    await query(
      "INSERT INTO meal_plans (code, name, price) VALUES ($1, $2, $3)",
      [m.code, m.name, m.price]
    );
  }
}

// ── Blocked Dates ──────────────────────────────────────────────────────

export async function getBlockedDates() {
  const res = await query("SELECT id, room_id, to_char(date, 'YYYY-MM-DD') AS date, unit_index FROM blocked_dates ORDER BY room_id, date");
  return res.rows as any[];
}

export async function replaceBlockedDates(dates: { room_id: number; date: string; unit_index?: number }[]) {
  await query("DELETE FROM blocked_dates");
  for (const d of dates) {
    await query(
      "INSERT INTO blocked_dates (room_id, date, unit_index) VALUES ($1, $2, $3)",
      [d.room_id, d.date, d.unit_index ?? 1]
    );
  }
}

// ── Bookings ───────────────────────────────────────────────────────────

export async function getAllBookings() {
  try {
    const res = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.phone, b.email, b.room_id, r.name AS room_name,
              to_char(b.check_in, 'YYYY-MM-DD') AS check_in,
              to_char(b.check_out, 'YYYY-MM-DD') AS check_out,
              b.nights, b.adults, b.children, b.units, b.amount, b.currency, b.meal_code,
              b.stripe_payment_intent, b.status, b.invoice_url, b.notes, b.tc_accepted,
              to_char(b.checkin_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checkin_at,
              to_char(b.checkout_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checkout_at,
              b.id_proof,
              b.payment_status, b.payment_gateway, b.payment_id, b.amount_paid,
              b.deposit_required, b.deposit_amount,
              to_char(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
              to_char(b.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
         FROM bookings b
         LEFT JOIN rooms r ON r.id = b.room_id
        ORDER BY b.created_at DESC`
    );
    return res.rows as any[];
  } catch (e: any) {
    if (!/amount_paid|payment_status|payment_gateway|payment_id|deposit_required|deposit_amount/i.test(e?.message || "")) throw e;
    const res = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.phone, b.email, b.room_id, r.name AS room_name,
              to_char(b.check_in, 'YYYY-MM-DD') AS check_in,
              to_char(b.check_out, 'YYYY-MM-DD') AS check_out,
              b.nights, b.adults, b.children, b.units, b.amount, b.currency, b.meal_code,
              b.stripe_payment_intent, b.status, b.invoice_url, b.notes, b.tc_accepted,
              to_char(b.checkin_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checkin_at,
              to_char(b.checkout_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checkout_at,
              b.id_proof,
              'pending' AS payment_status, '' AS payment_gateway, '' AS payment_id, 0 AS amount_paid,
              false AS deposit_required, 0 AS deposit_amount,
              to_char(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
              to_char(b.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
         FROM bookings b
         LEFT JOIN rooms r ON r.id = b.room_id
        ORDER BY b.created_at DESC`
    );
    return res.rows as any[];
  }
}

export async function getBookingByRef(bookingRef: string) {
  try {
    const res = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.phone, b.email, b.room_id, b.meal_code,
              b.adults, b.children, b.units, b.check_in, b.check_out, b.nights,
              b.amount, b.currency, b.stripe_payment_intent, b.status, b.invoice_url, b.notes, b.tc_accepted,
              b.checkin_at, b.checkout_at, b.id_proof,
              b.payment_status, b.payment_gateway, b.payment_id, b.amount_paid,
              b.deposit_required, b.deposit_amount,
              b.created_at, b.updated_at,
              r.name AS room_name, r.base_price, r.units AS room_units
         FROM bookings b
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.booking_ref = $1`,
      [bookingRef]
    );
    return res.rows[0] as any || null;
  } catch (e: any) {
    const res = await query(
      `SELECT b.*, r.name AS room_name, r.base_price, r.units AS room_units
         FROM bookings b LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.booking_ref = $1`,
      [bookingRef]
    );
    return res.rows[0] as any || null;
  }
}

export async function getBookingsInRange(from: string, to: string) {
  const res = await query(
    "SELECT * FROM bookings WHERE check_in < $2 AND check_out > $1 AND status != 'cancelled'",
    [from, to]
  );
  return res.rows as any[];
}

export async function createBooking(data: {
  booking_ref?: string;
  guest_name: string;
  phone?: string;
  email?: string;
  room_id: number;
  meal_code?: string;
  adults?: number;
  children?: number;
  units?: number;
  check_in: string;
  check_out: string;
  nights?: number;
  amount?: number;
  currency?: string;
  stripe_payment_intent?: string;
  status?: string;
  invoice_url?: string;
  notes?: string;
  tc_accepted?: boolean;
}) {
  const ref = data.booking_ref || "HBC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(Math.random() * 900) + 100;
  const res = await query(
    `INSERT INTO bookings (booking_ref, guest_name, phone, email, room_id, meal_code, adults, children, units, check_in, check_out, nights, amount, currency, stripe_payment_intent, status, invoice_url, notes, tc_accepted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      ref, data.guest_name, data.phone || "", data.email || "",
      data.room_id, data.meal_code || "", data.adults ?? 1, data.children ?? 0,
      data.units ?? 1, data.check_in, data.check_out,
      data.nights ?? 1, data.amount ?? 0, data.currency ?? "INR",
      data.stripe_payment_intent || "", data.status || "pending",
      data.invoice_url || "", data.notes || "", data.tc_accepted ?? false,
    ]
  );
  return { ...data, id: res.rows[0]?.id, booking_ref: ref };
}

export async function getMonthAvailability(roomId: number, year: number, month: number) {
  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const room = await query("SELECT units FROM rooms WHERE id = $1", [roomId]);
  const totalUnits = room.rows.length > 0 ? room.rows[0].units : 1;

  const blocked = await query(
    "SELECT to_char(date, 'YYYY-MM-DD') AS date_str, unit_index FROM blocked_dates WHERE room_id = $1 AND date >= $2::date AND date <= $3::date ORDER BY date",
    [roomId, startDate, endDate]
  );

  const bookings = await query(
    "SELECT to_char(check_in, 'YYYY-MM-DD') AS check_in_str, to_char(check_out, 'YYYY-MM-DD') AS check_out_str, units, status, guest_name, booking_ref FROM bookings WHERE room_id = $1 AND check_in < $3::date + 1 AND check_out > $2::date AND status != 'cancelled' ORDER BY check_in",
    [roomId, startDate, endDate]
  );

  return {
    blocked: blocked.rows.map((r: any) => ({ date: r.date_str, unitIndex: r.unit_index })),
    bookings: bookings.rows.map((r: any) => ({ checkIn: r.check_in_str, checkOut: r.check_out_str, units: r.units, guestName: r.guest_name, bookingRef: r.booking_ref })),
    totalUnits,
  };
}

function formatDate(d: Date | string) {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function getAvailableUnits(roomId: number, checkIn: string, checkOut: string) {
  const room = await query("SELECT units FROM rooms WHERE id = $1", [roomId]);
  if (room.rows.length === 0) return 0;
  const totalUnits = room.rows[0].units;

  const bookings = await query(
    "SELECT COALESCE(SUM(units), 0) AS booked FROM bookings WHERE room_id = $1 AND check_in < $2 AND check_out > $3 AND status != 'cancelled'",
    [roomId, checkOut, checkIn]
  );
  const bookedUnits = parseInt(bookings.rows[0].booked) || 0;

  const blocked = await query(
    "SELECT COUNT(DISTINCT unit_index) AS blocked FROM blocked_dates WHERE room_id = $1 AND date >= $2 AND date < $3",
    [roomId, checkIn, checkOut]
  );
  const blockedUnits = parseInt(blocked.rows[0].blocked) || 0;

  return Math.max(0, totalUnits - bookedUnits - blockedUnits);
}

export async function updateBookingStatus(bookingRef: string, status: string, stripePaymentIntent?: string) {
  const sets = ["status = $1", "updated_at = now()"];
  const params = [status];
  let idx = 2;
  if (stripePaymentIntent) {
    sets.push(`stripe_payment_intent = $${idx++}`);
    params.push(stripePaymentIntent);
  }
  params.push(bookingRef);
  await query(`UPDATE bookings SET ${sets.join(", ")} WHERE booking_ref = $${idx}`, params);
}

export async function bulkUpdateBookingStatus(refs: string[], status: string) {
  for (const ref of refs) {
    await query(
      "UPDATE bookings SET status = $1, updated_at = now() WHERE booking_ref = $2",
      [status, ref]
    );
  }
}

// ── Auth ───────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const res = await query("SELECT * FROM users WHERE email = $1 AND active = true", [email]);
  return res.rows[0] as any || null;
}

// ── Sync Log ──────────────────────────────────────────────────────────

export async function logSync(status: string, message: string) {
  await query(
    "INSERT INTO sync_log (source, status, message) VALUES ('api', $1, $2)",
    [status, message]
  );
}

// ── Activity Log ───────────────────────────────────────────────────────

export async function addActivityLog(action: string, entityType: string, entityId: string, description: string, userName?: string) {
  await query(
    "INSERT INTO activity_log (action, entity_type, entity_id, description, user_name) VALUES ($1,$2,$3,$4,$5)",
    [action, entityType, entityId, description, userName || "admin"]
  );
}

export async function getActivityLog(limit = 100) {
  const res = await query(
    "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return res.rows as any[];
}

// ── Users ──────────────────────────────────────────────────────────────

export async function getUsers() {
  const res = await query("SELECT id, name, email, role, active, created_at FROM users ORDER BY id");
  return res.rows as any[];
}

export async function createUser(data: { name: string; email: string; password_hash: string; role: string }) {
  const res = await query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
    [data.name, data.email, data.password_hash, data.role]
  );
  return res.rows[0] as any;
}

export async function updateUser(id: number, data: { name?: string; email?: string; role?: string; active?: boolean; password_hash?: string }) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (data.name !== undefined) { sets.push(`name = $${i++}`); params.push(data.name); }
  if (data.email !== undefined) { sets.push(`email = $${i++}`); params.push(data.email); }
  if (data.role !== undefined) { sets.push(`role = $${i++}`); params.push(data.role); }
  if (data.active !== undefined) { sets.push(`active = $${i++}`); params.push(data.active); }
  if (data.password_hash !== undefined) { sets.push(`password_hash = $${i++}`); params.push(data.password_hash); }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);
  params.push(id);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

// ── Email Templates ────────────────────────────────────────────────────

export async function getEmailTemplates() {
  const res = await query("SELECT * FROM email_templates ORDER BY trigger_event");
  return res.rows as any[];
}

export async function updateEmailTemplate(id: number, data: { subject?: string; body?: string; active?: boolean }) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (data.subject !== undefined) { sets.push(`subject = $${i++}`); params.push(data.subject); }
  if (data.body !== undefined) { sets.push(`body = $${i++}`); params.push(data.body); }
  if (data.active !== undefined) { sets.push(`active = $${i++}`); params.push(data.active); }
  if (sets.length === 0) return;
  sets.push("updated_at = now()");
  params.push(id);
  await query(`UPDATE email_templates SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

// ── Housekeeping ───────────────────────────────────────────────────────

export async function getHousekeepingTasks(date?: string) {
  if (date) {
    const res = await query("SELECT * FROM housekeeping_tasks WHERE scheduled_date = $1 ORDER BY scheduled_date DESC", [date]);
    return res.rows as any[];
  }
  const res = await query("SELECT * FROM housekeeping_tasks ORDER BY scheduled_date DESC");
  return res.rows as any[];
}

export async function upsertHousekeepingTask(data: {
  id?: number;
  room_id: number;
  task_type: string;
  status: string;
  assigned_to?: string;
  notes?: string;
  scheduled_date: string;
}) {
  if (data.id) {
    await query(
      `UPDATE housekeeping_tasks SET room_id=$1, task_type=$2, status=$3, assigned_to=$4, notes=$5, scheduled_date=$6, updated_at=now() WHERE id=$7`,
      [data.room_id, data.task_type, data.status, data.assigned_to || "", data.notes || "", data.scheduled_date, data.id]
    );
  } else {
    await query(
      `INSERT INTO housekeeping_tasks (room_id, task_type, status, assigned_to, notes, scheduled_date) VALUES ($1,$2,$3,$4,$5,$6)`,
      [data.room_id, data.task_type, data.status, data.assigned_to || "", data.notes || "", data.scheduled_date]
    );
  }
}

// ── Invoices ───────────────────────────────────────────────────────────

export async function getInvoices() {
  const res = await query("SELECT * FROM invoices ORDER BY created_at DESC");
  return res.rows as any[];
}

export async function getInvoiceById(id: number) {
  const res = await query("SELECT * FROM invoices WHERE id = $1", [id]);
  return res.rows[0] as any || null;
}

export async function getInvoiceByBooking(bookingRef: string) {
  const res = await query("SELECT * FROM invoices WHERE booking_ref = $1 LIMIT 1", [bookingRef]);
  return res.rows[0] as any || null;
}

export async function createInvoice(data: {
  booking_ref: string;
  invoice_no: string;
  guest_name: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
  status?: string;
}) {
  const res = await query(
    `INSERT INTO invoices (booking_ref, invoice_no, guest_name, items, subtotal, tax, total, currency, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [data.booking_ref, data.invoice_no, data.guest_name, JSON.stringify(data.items), data.subtotal, data.tax, data.total, data.currency || "INR", data.status || "draft"]
  );
  return res.rows[0] as any;
}

export async function updateInvoiceStatus(id: number, status: string) {
  await query(
    `UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN now() ELSE paid_at END WHERE id = $2`,
    [status, id]
  );
}

// ── Payments ───────────────────────────────────────────────────────────

export async function recordPayment(data: {
  booking_ref: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  recorded_by?: string;
}) {
  const res = await query(
    `INSERT INTO payments (booking_ref, amount, method, reference, notes, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      data.booking_ref,
      data.amount,
      data.method || "bank",
      data.reference || "",
      data.notes || "",
      data.recorded_by || "admin",
    ]
  );
  await query(
    `UPDATE bookings SET amount_paid = COALESCE(amount_paid, 0) + $1, updated_at = now() WHERE booking_ref = $2`,
    [data.amount, data.booking_ref]
  );
  return res.rows[0] as any;
}

export async function getPaymentsForBooking(bookingRef: string) {
  const res = await query(
    `SELECT id, amount, currency, method, reference, notes, recorded_by,
            to_char(recorded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS recorded_at
       FROM payments WHERE booking_ref = $1 ORDER BY recorded_at DESC`,
    [bookingRef]
  );
  return res.rows as any[];
}

export async function getTotalPaid(bookingRef: string) {
  const res = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE booking_ref = $1`,
    [bookingRef]
  );
  return parseInt(res.rows[0]?.total) || 0;
}

// ── Guests (auto-create from booking) ──────────────────────────────────

export async function upsertGuestFromBooking(data: {
  name: string;
  email?: string;
  phone?: string;
  amount_spent?: number;
}) {
  const email = (data.email || "").trim().toLowerCase();
  if (!email) return null;
  await query(
    `INSERT INTO guests (name, email, phone, total_stays, total_spend, last_stay)
     VALUES ($1, $2, $3, 1, $4, CURRENT_DATE)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       phone = COALESCE(NULLIF(EXCLUDED.phone, ''), guests.phone),
       total_stays = guests.total_stays + 1,
       total_spend = guests.total_spend + EXCLUDED.total_spend,
       last_stay = CURRENT_DATE,
       updated_at = now()`,
    [data.name || "Guest", email, data.phone || "", data.amount_spent || 0]
  );
  const res = await query("SELECT * FROM guests WHERE email = $1", [email]);
  return res.rows[0] as any || null;
}

// ── Email helpers ──────────────────────────────────────────────────────

export async function getEmailTemplate(triggerEvent: string) {
  const res = await query(
    `SELECT * FROM email_templates WHERE trigger_event = $1 AND active = true LIMIT 1`,
    [triggerEvent]
  );
  return res.rows[0] as any || null;
}

export async function getTaxRate(): Promise<number> {
  const res = await query("SELECT value FROM settings WHERE key = 'tax_rate' LIMIT 1");
  const raw = res.rows[0]?.value;
  const n = raw ? parseFloat(raw) : 12;
  return isNaN(n) ? 12 : n;
}

// ── State machine ──────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:     ["confirmed", "cancelled"],
  confirmed:   ["checked-in", "cancelled", "pending"],
  "checked-in": ["checked-out"],
  "checked-out": [],
  cancelled:   ["pending"],
};

export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionBookingStatus(bookingRef: string, to: string): Promise<{ ok: boolean; reason?: string; from?: string }> {
  const res = await query("SELECT status FROM bookings WHERE booking_ref = $1", [bookingRef]);
  if (res.rows.length === 0) return { ok: false, reason: "Booking not found" };
  const from = res.rows[0].status;
  if (!isValidStatusTransition(from, to)) {
    return { ok: false, reason: `Cannot transition from ${from} to ${to}`, from };
  }
  return { ok: true, from };
}
