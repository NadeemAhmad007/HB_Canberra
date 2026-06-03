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
  const notifications = await sql`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50` as unknown;
  return NextResponse.json(notifications);
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const body = await request.json();
  await sql`UPDATE notifications SET read = true WHERE id = ${body.id}`;
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const body = await request.json();
  const [row] = await sql`
    INSERT INTO notifications (title, message, type, link)
    VALUES (${body.title}, ${body.message || ""}, ${body.type || "info"}, ${body.link || ""})
    RETURNING id
  ` as unknown as Array<{ id: number }>;
  return NextResponse.json(row);
}
