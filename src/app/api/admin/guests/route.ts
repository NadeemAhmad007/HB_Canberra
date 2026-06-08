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
  if (!password) return false;
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice(7) === password;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const guests = await sql`SELECT * FROM guests ORDER BY updated_at DESC` as unknown;
  return NextResponse.json(guests);
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const sql = getSql();
  const body = await request.json();

  if (body.id) {
    await sql`
      UPDATE guests SET name = ${body.name}, email = ${body.email}, phone = ${body.phone},
        address = ${body.address}, nationality = ${body.nationality}, notes = ${body.notes},
        vip = ${body.vip}, updated_at = now()
      WHERE id = ${body.id}
    `;
    return NextResponse.json({ ok: true });
  }

  const [row] = await sql`
    INSERT INTO guests (name, email, phone, address, nationality, notes, vip)
    VALUES (${body.name}, ${body.email || ""}, ${body.phone || ""}, ${body.address || ""}, ${body.nationality || ""}, ${body.notes || ""}, ${body.vip || false})
    RETURNING id
  ` as unknown as Array<{ id: number }>;
  return NextResponse.json(row);
}
