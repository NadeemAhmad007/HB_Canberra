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
      INSERT INTO rooms (id, name, units, base_price, max_adults, max_children, child_policy, updated_at)
      VALUES (${r.id}, ${r.name}, ${r.units}, ${r.base_price}, ${r.max_adults}, ${r.max_children}, ${r.child_policy}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        units = EXCLUDED.units,
        base_price = EXCLUDED.base_price,
        max_adults = EXCLUDED.max_adults,
        max_children = EXCLUDED.max_children,
        child_policy = EXCLUDED.child_policy,
        updated_at = now()
    `;
  }
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
  const rows = await (sql`SELECT key, value FROM property_config` as unknown as Promise<Array<{ key: string; value: string }>>);
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

// ── Bookings ─────────────────────────────────────────────────────────────
export async function createBooking(b: Omit<Booking, "id" | "created_at">) {
  const sql = getSql();
  const [row] = await (sql`
    INSERT INTO bookings (booking_ref, guest_name, phone, email, room_id, meal_code, adults, children, units, check_in, check_out, nights, amount, currency, stripe_payment_intent, status, invoice_url)
    VALUES (${b.booking_ref}, ${b.guest_name}, ${b.phone}, ${b.email}, ${b.room_id}, ${b.meal_code}, ${b.adults}, ${b.children}, ${b.units}, ${b.check_in}, ${b.check_out}, ${b.nights}, ${b.amount}, ${b.currency}, ${b.stripe_payment_intent}, ${b.status}, ${b.invoice_url})
    RETURNING id, created_at
  ` as unknown as Promise<Array<{ id: string; created_at: string }>>);
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
  source = "google-sheets"
) {
  const sql = getSql();
  await sql`
    INSERT INTO sync_log (source, status, message)
    VALUES (${source}, ${status}, ${message})
  `;
}
