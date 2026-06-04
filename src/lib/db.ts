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
  const res = await query("SELECT id, room_id, date, unit_index FROM blocked_dates ORDER BY room_id, date");
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
  const res = await query(
    "SELECT * FROM bookings ORDER BY created_at DESC"
  );
  return res.rows as any[];
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
  const endDate = `${year}-${monthStr}-31`;

  const room = await query("SELECT units FROM rooms WHERE id = $1", [roomId]);
  const totalUnits = room.rows.length > 0 ? room.rows[0].units : 1;

  const blocked = await query(
    "SELECT date, unit_index FROM blocked_dates WHERE room_id = $1 AND date >= $2 AND date <= $3 ORDER BY date",
    [roomId, startDate, endDate]
  );

  const checkInEnd = endDate;
  const checkOutStart = startDate;
  const bookings = await query(
    "SELECT check_in, check_out, units, status, guest_name, booking_ref FROM bookings WHERE room_id = $1 AND check_in < $2 AND check_out > $3 AND status != 'cancelled' ORDER BY check_in",
    [roomId, checkInEnd, checkOutStart]
  );

  return {
    blocked: blocked.rows.map((r: any) => ({ date: formatDate(r.date), unitIndex: r.unit_index })),
    bookings: bookings.rows.map((r: any) => ({ checkIn: formatDate(r.check_in), checkOut: formatDate(r.check_out), units: r.units, guestName: r.guest_name, bookingRef: r.booking_ref })),
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
