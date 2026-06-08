import crypto from "crypto";
import { NextResponse } from "next/server";

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function createSessionToken(user: { name: string; email: string; role: string }): string {
  const key = getSecret();
  if (!key) return "";
  const payload = {
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): { name: string; email: string; role: string } | null {
  const key = getSecret();
  if (!key) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const sig = crypto.createHmac("sha256", key).update(parts[0]).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts[1]))) return null;
  } catch {
    if (sig !== parts[1]) return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return { name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export function checkAdminAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (token === password) return true;
  return verifySessionToken(token) !== null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function checkCSRF(request: Request): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD") return true;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true;
  const allowedOrigins = [
    "https://hb-canberra.vercel.app",
    "https://houseboatcanberra.com",
    "https://www.houseboatcanberra.com",
    "http://localhost:3000",
  ];
  const source = origin || referer || "";
  return allowedOrigins.some((a) => source.startsWith(a));
}
