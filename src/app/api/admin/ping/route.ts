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
    let maxTs: number = 0;
    for (const src of SOURCES) {
      try {
        const res = await query(
          `SELECT to_char(MAX(${src.column}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts
           FROM ${src.table}`
        );
        const ts = res.rows[0]?.ts;
        if (ts) {
          const t = new Date(ts).getTime();
          if (!isNaN(t) && t > maxTs) maxTs = t;
        }
      } catch {
        // Table missing or query errored — skip this source.
      }
    }
    return NextResponse.json(
      { ts: new Date(maxTs).toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Ping failed", detail: (error as Error).message },
      { status: 500 }
    );
  }
}
