import { NextResponse } from "next/server";

/**
 * Enquiry intake for the floating booking panel. Validates a payload and
 * pretends to hand it to the reservations desk. In production this would
 * forward to email / WhatsApp / PMS — the contract here is the public
 * surface the front-end cares about.
 */

export const runtime = "nodejs";

interface EnquiryPayload {
  name?: string;
  email?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomId?: string;
  promo?: string | null;
  notes?: string;
}

interface ValidationFailure {
  ok: false;
  field: keyof EnquiryPayload;
  message: string;
}

interface ValidationSuccess {
  ok: true;
  data: Required<Pick<EnquiryPayload, "name" | "email" | "phone" | "checkIn" | "checkOut" | "guests" | "roomId">>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{6,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validate(body: unknown): ValidationFailure | ValidationSuccess {
  if (!body || typeof body !== "object") {
    return { ok: false, field: "name", message: "Empty request body" };
  }
  const b = body as EnquiryPayload;

  const name = (b.name ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, field: "name", message: "Please share your full name" };
  }

  const email = (b.email ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, field: "email", message: "That email address looks off" };
  }

  const phone = (b.phone ?? "").trim();
  if (!PHONE_RE.test(phone)) {
    return { ok: false, field: "phone", message: "Please include a phone we can reach on" };
  }

  const checkIn = (b.checkIn ?? "").trim();
  const checkOut = (b.checkOut ?? "").trim();
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) {
    return { ok: false, field: "checkIn", message: "Pick a check-in and check-out date" };
  }
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inDate < today) {
    return { ok: false, field: "checkIn", message: "Check-in cannot be in the past" };
  }
  if (outDate <= inDate) {
    return { ok: false, field: "checkOut", message: "Check-out must be after check-in" };
  }

  const guests = Number(b.guests);
  if (!Number.isFinite(guests) || guests < 1 || guests > 8) {
    return { ok: false, field: "guests", message: "Guests must be between 1 and 8" };
  }

  const roomId = (b.roomId ?? "").trim();
  if (!roomId) {
    return { ok: false, field: "roomId", message: "Please choose a suite" };
  }

  return {
    ok: true,
    data: { name, email, phone, checkIn, checkOut, guests, roomId },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, field: "name", message: "Malformed request" },
      { status: 400 },
    );
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  // In production, forward to email / WhatsApp / PMS. For now we just log
  // and ack — front-end treats any 2xx as success.
  console.log("[Houseboat Canberra] enquiry received", {
    ref: `HBC-${Date.now().toString(36).toUpperCase()}`,
    ...result.data,
    notes: (body as EnquiryPayload).notes ?? null,
    promo: (body as EnquiryPayload).promo ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      ref: `HBC-${Date.now().toString(36).toUpperCase()}`,
      message:
        "Your request has reached the reservations desk. You will hear from us within the hour.",
    },
    { status: 200 },
  );
}
