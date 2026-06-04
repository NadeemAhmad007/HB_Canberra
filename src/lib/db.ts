import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

export interface Room {
  id: number;
  name: string;
  units: number;
  base_price: number;
  max_adults: number;
  max_children: number;
  child_policy: string;
  active: boolean;
  status: string;
}

export interface Season {
  start_date: string;
  end_date: string;
  multiplier: number;
}

export interface MealPlan {
  code: string;
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  booking_ref: string;
  guest_name: string;
  phone: string;
  email: string;
  room_id: number;
  meal_code: string;
  adults: number;
  children: number;
  units: number;
  check_in: string;
  check_out: string;
  nights: number;
  amount: number;
  currency: string;
  stripe_payment_intent: string;
  status: string;
  invoice_url: string;
  created_at: string;
}

export interface BlockedDate {
  room_id: number;
  date: string;
}

// ── Rooms ────────────────────────────────────────────────────────────────
export async function getRooms(): Promise<Room[]> {
  const sql = getSql();
  return sql`SELECT * FROM rooms ORDER BY id` as unknown as Promise<Room[]>;
}

export async function upsertRooms(rooms: Room[]) {
  const sql = getSql();
  for (const r of rooms) {
    await sql`
      INSERT INTO rooms (id, name, units, base_price, max_adults, max_children, child_policy, active, status, updated_at)
      VALUES (${r.id}, ${r.name}, ${r.units}, ${r.base_price}, ${r.max_adults}, ${r.max_children}, ${r.child_policy}, ${r.active ?? true}, ${r.status || 'available'}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        units = EXCLUDED.units,
        base_price = EXCLUDED.base_price,
        max_adults = EXCLUDED.max_adults,
        max_children = EXCLUDED.max_children,
        child_policy = EXCLUDED.child_policy,
        active = EXCLUDED.active,
        status = EXCLUDED.status,
        updated_at = now()
    `;
  }
}

// ── Availability ─────────────────────────────────────────────────────────
/** How many units of a room are available (not booked + not blocked) for a date range */
export async function getAvailableUnits(roomId: number, checkIn: string, checkOut: string): Promise<number> {
  const sql = getSql();
  const total = await sql`SELECT units FROM rooms WHERE id = ${roomId}` as unknown as Array<{ units: number }>;
  if (!total || !total[0]) return 0;

  // Count units already booked in overlapping date ranges
  const booked = await sql`
    SELECT COALESCE(SUM(units), 0) as booked
    FROM bookings
    WHERE room_id = ${roomId}
      AND status != 'cancelled'
      AND check_in < ${checkOut}::date
      AND check_out > ${checkIn}::date
  ` as unknown as Array<{ booked: number }>;

  // Count blocked dates that cover ANY day in the range
  const blockedDays = await sql`
    SELECT COUNT(DISTINCT date) as days
    FROM blocked_dates
    WHERE room_id = ${roomId}
      AND date >= ${checkIn}::date
      AND date < ${checkOut}::date
  ` as unknown as Array<{ days: number }>;

  const un = total[0].units;
  const bk = Number(booked?.[0]?.booked ?? 0);
  const bl = Number(blockedDays?.[0]?.days ?? 0);

  // Each distinct blocked date represents one unit being unavailable on that day.
  // Cap blocked units at the total units for the room.
  const blockedUnits = Math.min(un, bl);
  const available = un - bk - blockedUnits;
  return Math.max(0, available);
}

/** Get total units for a room type */
export async function getTotalUnits(roomId: number): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT units FROM rooms WHERE id = ${roomId}` as unknown as Array<{ units: number }>;
  return rows?.[0]?.units ?? 0;
}

// ── Seasons ──────────────────────────────────────────────────────────────
export async function getSeasons(): Promise<Season[]> {
  const sql = getSql();
  return sql`SELECT * FROM seasons ORDER BY start_date` as unknown as Promise<Season[]>;
}

export async function replaceSeasons(seasons: Season[]) {
  const sql = getSql();
  await sql`DELETE FROM seasons`;
  for (const s of seasons) {
    await sql`
      INSERT INTO seasons (start_date, end_date, multiplier)
      VALUES (${s.start_date}, ${s.end_date}, ${s.multiplier})
    `;
  }
}

// ── Meal plans ───────────────────────────────────────────────────────────
export async function getMealPlans(): Promise<MealPlan[]> {
  const sql = getSql();
  return sql`SELECT * FROM meal_plans ORDER BY code` as unknown as Promise<MealPlan[]>;
}

export async function replaceMealPlans(plans: MealPlan[]) {
  const sql = getSql();
  await sql`DELETE FROM meal_plans`;
  for (const p of plans) {
    await sql`
      INSERT INTO meal_plans (code, name, price)
      VALUES (${p.code}, ${p.name}, ${p.price})
    `;
  }
}

// ── Property config ──────────────────────────────────────────────────────
export async function getPropertyConfig(): Promise<Record<string, string>> {
  const sql = getSql();
  const rows = await sql`SELECT key, value FROM property_config` as unknown as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function replacePropertyConfig(config: Record<string, string>) {
  const sql = getSql();
  await sql`DELETE FROM property_config`;
  for (const [key, value] of Object.entries(config)) {
    await sql`
      INSERT INTO property_config (key, value)
      VALUES (${key}, ${value})
    `;
  }
}

// ── Blocked dates ────────────────────────────────────────────────────────
export async function getBlockedDates(): Promise<BlockedDate[]> {
  const sql = getSql();
  return sql`SELECT room_id, date::text FROM blocked_dates ORDER BY room_id, date` as unknown as Promise<BlockedDate[]>;
}

export async function replaceBlockedDates(
  blocked: Record<string, string[]>
) {
  const sql = getSql();
  await sql`DELETE FROM blocked_dates`;
  for (const [roomId, dates] of Object.entries(blocked)) {
    for (const date of dates) {
      await sql`
        INSERT INTO blocked_dates (room_id, date)
        VALUES (${parseInt(roomId)}, ${date})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

// ── Admin: get all bookings ──────────────────────────────────────────────
export interface BookingWithRoom extends Booking {
  room_name: string;
}
export async function getAllBookings(): Promise<BookingWithRoom[]> {
  const sql = getSql();
  return sql`
    SELECT b.*, r.name as room_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    ORDER BY b.created_at DESC
  ` as unknown as Promise<BookingWithRoom[]>;
}

// ── Bookings ─────────────────────────────────────────────────────────────
export async function createBooking(b: any) {
  const sql = getSql();
  const [row] = await sql`
    INSERT INTO bookings (booking_ref, guest_name, phone, email, room_id, meal_code, adults, children, units, check_in, check_out, nights, amount, currency, stripe_payment_intent, status, invoice_url, notes, tc_accepted)
    VALUES (${b.booking_ref}, ${b.guest_name}, ${b.phone}, ${b.email}, ${b.room_id}, ${b.meal_code}, ${b.adults}, ${b.children}, ${b.units}, ${b.check_in}, ${b.check_out}, ${b.nights}, ${b.amount}, ${b.currency}, ${b.stripe_payment_intent}, ${b.status}, ${b.invoice_url}, ${b.notes || ''}, ${b.tc_accepted || false})
    RETURNING id, created_at
  ` as unknown as Array<{ id: string; created_at: string }>;
  return row;
}

export async function updateBookingStatus(
  bookingRef: string,
  status: string,
  stripePaymentIntent?: string
) {
  const sql = getSql();
  if (stripePaymentIntent) {
    await sql`
      UPDATE bookings SET status = ${status}, stripe_payment_intent = ${stripePaymentIntent}, updated_at = now()
      WHERE booking_ref = ${bookingRef}
    `;
  } else {
    await sql`
      UPDATE bookings SET status = ${status}, updated_at = now()
      WHERE booking_ref = ${bookingRef}
    `;
  }
}

// ── Sync log ─────────────────────────────────────────────────────────────
export async function logSync(
  status: string,
  message: string,
  source = "admin"
) {
  const sql = getSql();
  await sql`
    INSERT INTO sync_log (source, status, message)
    VALUES (${source}, ${status}, ${message})
  `;
}

// ── Activity log ──────────────────────────────────────────────────────────
export async function addActivityLog(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  userName = "admin"
) {
  const sql = getSql();
  await sql`
    INSERT INTO activity_log (action, entity_type, entity_id, description, user_name)
    VALUES (${action}, ${entityType}, ${entityId}, ${description}, ${userName})
  `;
}

export async function getActivityLog(limit = 100) {
  const sql = getSql();
  return sql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ${limit}` as unknown;
}

// ── Users (role-based auth) ───────────────────────────────────────────────
export interface AppUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  active: boolean;
}
export async function getUsers() {
  const sql = getSql();
  return sql`SELECT id, name, email, role, active, created_at FROM users ORDER BY name` as unknown;
}
export async function getUserByEmail(email: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE email = ${email} AND active = true` as unknown as AppUser[];
  return rows?.[0] ?? null;
}
export async function createUser(user: { name: string; email: string; password_hash: string; role: string }) {
  const sql = getSql();
  const [row] = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (${user.name}, ${user.email}, ${user.password_hash}, ${user.role})
    RETURNING id, name, email, role, created_at
  ` as unknown;
  return row;
}
export async function updateUser(id: number, data: { name?: string; email?: string; role?: string; active?: boolean }) {
  const sql = getSql();
  if (data.name !== undefined) await sql`UPDATE users SET name = ${data.name}, updated_at = now() WHERE id = ${id}`;
  if (data.email !== undefined) await sql`UPDATE users SET email = ${data.email}, updated_at = now() WHERE id = ${id}`;
  if (data.role !== undefined) await sql`UPDATE users SET role = ${data.role}, updated_at = now() WHERE id = ${id}`;
  if (data.active !== undefined) await sql`UPDATE users SET active = ${data.active}, updated_at = now() WHERE id = ${id}`;
}

// ── Email templates ───────────────────────────────────────────────────────
export async function getEmailTemplates() {
  const sql = getSql();
  return sql`SELECT * FROM email_templates ORDER BY trigger_event` as unknown;
}
export async function updateEmailTemplate(id: number, data: { subject?: string; body?: string; active?: boolean }) {
  const sql = getSql();
  if (data.subject !== undefined) await sql`UPDATE email_templates SET subject = ${data.subject}, updated_at = now() WHERE id = ${id}`;
  if (data.body !== undefined) await sql`UPDATE email_templates SET body = ${data.body}, updated_at = now() WHERE id = ${id}`;
  if (data.active !== undefined) await sql`UPDATE email_templates SET active = ${data.active}, updated_at = now() WHERE id = ${id}`;
}

// ── Housekeeping ──────────────────────────────────────────────────────────
export async function getHousekeepingTasks(date?: string) {
  const sql = getSql();
  if (date) {
    return sql`
      SELECT h.*, r.name as room_name
      FROM housekeeping_tasks h
      JOIN rooms r ON r.id = h.room_id
      WHERE h.scheduled_date = ${date}::date
      ORDER BY h.created_at DESC
    ` as unknown;
  }
  return sql`
    SELECT h.*, r.name as room_name
    FROM housekeeping_tasks h
    JOIN rooms r ON r.id = h.room_id
    ORDER BY h.scheduled_date DESC, h.created_at DESC
  ` as unknown;
}
export async function upsertHousekeepingTask(task: {
  id?: number; room_id: number; task_type: string; status?: string;
  assigned_to?: string; notes?: string; scheduled_date?: string;
}) {
  const sql = getSql();
  if (task.id) {
    await sql`
      UPDATE housekeeping_tasks SET
        task_type = ${task.task_type}, status = ${task.status || 'pending'},
        assigned_to = ${task.assigned_to || ''}, notes = ${task.notes || ''},
        scheduled_date = ${task.scheduled_date || new Date().toISOString().slice(0, 10)}::date,
        completed_at = ${task.status === 'completed' ? sql`now()` : null},
        updated_at = now()
      WHERE id = ${task.id}
    `;
  } else {
    await sql`
      INSERT INTO housekeeping_tasks (room_id, task_type, status, assigned_to, notes, scheduled_date)
      VALUES (${task.room_id}, ${task.task_type}, ${task.status || 'pending'}, ${task.assigned_to || ''}, ${task.notes || ''}, ${task.scheduled_date || new Date().toISOString().slice(0, 10)}::date)
    `;
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────
export async function getInvoices() {
  const sql = getSql();
  return sql`SELECT * FROM invoices ORDER BY created_at DESC` as unknown;
}
export async function createInvoice(inv: {
  booking_ref: string; invoice_no: string; guest_name: string;
  items: any[]; subtotal: number; tax: number; total: number; currency: string;
}) {
  const sql = getSql();
  const [row] = await sql`
    INSERT INTO invoices (booking_ref, invoice_no, guest_name, items, subtotal, tax, total, currency)
    VALUES (${inv.booking_ref}, ${inv.invoice_no}, ${inv.guest_name}, ${JSON.stringify(inv.items)}, ${inv.subtotal}, ${inv.tax}, ${inv.total}, ${inv.currency})
    RETURNING id, invoice_no, created_at
  ` as unknown;
  return row;
}
export async function updateInvoiceStatus(id: number, status: string) {
  const sql = getSql();
  await sql`UPDATE invoices SET status = ${status}, paid_at = ${status === 'paid' ? sql`now()` : null} WHERE id = ${id}`;
}

// ── Availability calendar (per-month) ─────────────────────────────────────
export async function getMonthAvailability(roomId: number, year: number, month: number) {
  const sql = getSql();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const [blocked, booked, total] = await Promise.all([
    sql`SELECT date::text FROM blocked_dates WHERE room_id = ${roomId} AND date >= ${monthStart}::date AND date < ${nextMonth}::date` as unknown as Array<{ date: string }>,
    sql`SELECT check_in, check_out, units FROM bookings WHERE room_id = ${roomId} AND status != 'cancelled' AND check_in < ${nextMonth}::date AND check_out > ${monthStart}::date` as unknown as Array<{ check_in: string; check_out: string; units: number }>,
    sql`SELECT units FROM rooms WHERE id = ${roomId}` as unknown as Array<{ units: number }>,
  ]);
  return {
    blocked: blocked.map(b => b.date),
    bookings: booked.map(b => ({ checkIn: b.check_in, checkOut: b.check_out, units: b.units })),
    totalUnits: total?.[0]?.units ?? 0,
  };
}

// ── Bulk booking status update ────────────────────────────────────────────
export async function bulkUpdateBookingStatus(refs: string[], status: string) {
  const sql = getSql();
  for (const ref of refs) {
    await sql`UPDATE bookings SET status = ${status}, updated_at = now() WHERE booking_ref = ${ref}`;
  }
}
