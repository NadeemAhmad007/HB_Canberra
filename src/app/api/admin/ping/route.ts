import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const res = await query(`
      SELECT GREATEST(
        COALESCE((SELECT MAX(updated_at) FROM bookings), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM invoices),  '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(recorded_at) FROM payments), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM guests),    '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM housekeeping_tasks), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM blocked_dates), '1970-01-01'::timestamptz)
      ) AS ts
    `);
    const ts = res.rows[0]?.ts ? new Date(res.rows[0].ts).toISOString() : new Date(0).toISOString();
    return NextResponse.json(
      { ts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json({ error: "Ping failed" }, { status: 500 });
  }
}
