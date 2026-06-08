import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { checkLoginRateLimit, checkCSRF } from "@/lib/auth";
import { compare } from "bcryptjs";

export async function POST(request: Request) {
  if (!checkCSRF(request)) {
    return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for") || "unknown";
    const ip = forwarded.split(",")[0]?.trim() || "unknown";
    const rateKey = email ? `login:${email}` : `login:${ip}`;
    if (!checkLoginRateLimit(rateKey)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && password === adminPassword) {
      return NextResponse.json({
        token: adminPassword,
        user: { name: "Admin", email: "admin@houseboatcanberra.com", role: "owner" },
      });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let passwordValid = false;
    if (user.password_hash && user.password_hash.length === 64) {
      passwordValid = user.password_hash === legacyHash(password);
    } else {
      passwordValid = await compare(password, user.password_hash || "");
    }

    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = adminPassword || `user:${user.id}:${user.email}`;

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

function legacyHash(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
