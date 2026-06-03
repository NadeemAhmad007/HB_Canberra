import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

function checkAuth(request: Request) {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return true;
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice(7) === password;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const settings = await sql`SELECT * FROM settings ORDER BY key` as unknown as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of settings) map[r.key] = r.value;
  return NextResponse.json(map);
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    await sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES (${key}, ${String(value)}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }
  return NextResponse.json({ ok: true });
}
