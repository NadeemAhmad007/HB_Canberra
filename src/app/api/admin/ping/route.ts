import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const SOURCES: { table: string; column: string }[] = [
  { table: "bookings", column: "updated_at" },
  { table: "invoices", column: "updated_at" },
  { table: "payments", column: "recorded_at" },
  { table: "guests", column: "updated_at" },
  { table: "housekeeping_tasks", column: "updated_at" },
  { table: "blocked_dates", column: "updated_at" },
];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const existing = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [SOURCES.map((s) => s.table)]
    );
    const present = new Set(existing.rows.map((r) => r.table_name));

    const parts: string[] = [];
    for (const src of SOURCES) {
      if (present.has(src.table)) {
        parts.push(`(SELECT MAX(${src.column}) FROM ${src.table})`);
      }
    }
    if (parts.length === 0) {
      return NextResponse.json(
        { ts: new Date(0).toISOString() },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const res = await query(
      `SELECT GREATEST(${parts.map((p) => `COALESCE(${p}, '1970-01-01'::timestamptz)`).join(", ")}) AS ts`
    );
    const ts = res.rows[0]?.ts ? new Date(res.rows[0].ts).toISOString() : new Date(0).toISOString();
    return NextResponse.json(
      { ts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Ping failed", detail: (error as Error).message },
      { status: 500 }
    );
  }
}
