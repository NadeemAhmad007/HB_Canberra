import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Admin password fallback
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      return NextResponse.json({
        token: adminPassword,
        user: { name: "Admin", email: "admin@houseboatcanberra.com", role: "owner" },
      });
    }

    // DB user auth
    const user = await getUserByEmail(email);
    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      token: process.env.ADMIN_PASSWORD || user.email,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
