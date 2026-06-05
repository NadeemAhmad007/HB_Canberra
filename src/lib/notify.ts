import { neon } from "@neondatabase/serverless";
import { sendEmail } from "./email";

export type NewBookingPayload = {
  ref: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  roomName?: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  amount?: number;
  currency?: string;
  source: "website" | "pms" | "admin" | "mark-paid";
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

async function getAdminEmail(): Promise<string> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT value FROM settings WHERE key = 'hotel_email' LIMIT 1` as unknown as Array<{ value: string }>;
    const fromSettings = rows[0]?.value?.trim();
    if (fromSettings) return fromSettings;
  } catch { }
  return process.env.ADMIN_NOTIFY_EMAIL || "houseboat.canberra@gmail.com";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAdminEmailHtml(p: NewBookingPayload, propertyName: string): string {
  const cur = p.currency || "INR";
  const amt = p.amount ? `${cur} ${p.amount.toLocaleString()}` : "—";
  const nights = p.nights ?? 1;
  return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0A0D0C;color:#fff;padding:32px 28px;border-radius:12px">
    <div style="border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:16px;margin-bottom:20px">
      <h1 style="font-size:16px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#C8A86B;margin:0">${escapeHtml(propertyName)}</h1>
      <p style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin:6px 0 0;text-transform:uppercase">New booking</p>
    </div>
    <h2 style="font-size:18px;font-weight:400;color:#C8A86B;margin:0 0 6px">${escapeHtml(p.guestName)}</h2>
    <p style="font-size:12px;color:rgba(255,255,255,0.55);margin:0 0 18px">Ref <strong style="color:#C8A86B;font-family:monospace">${escapeHtml(p.ref)}</strong> · via ${escapeHtml(p.source)}</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0 18px">
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;width:40%">Room</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px">${escapeHtml(p.roomName || "Room")}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-in</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px">${escapeHtml(p.checkIn)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-out</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px">${escapeHtml(p.checkOut)}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Nights</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px">${nights}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Total</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px"><strong>${escapeHtml(amt)}</strong></td></tr>
      ${p.guestEmail ? `<tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Guest email</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px"><a href="mailto:${escapeHtml(p.guestEmail)}" style="color:#C8A86B">${escapeHtml(p.guestEmail)}</a></td></tr>` : ""}
      ${p.guestPhone ? `<tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Guest phone</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px"><a href="tel:${escapeHtml(p.guestPhone)}" style="color:#C8A86B">${escapeHtml(p.guestPhone)}</a></td></tr>` : ""}
    </table>
    <p style="margin:0"><a href="${process.env.ADMIN_URL || "https://houseboatcanberra.com/admin/bookings"}" style="display:inline-block;background:#C8A86B;color:#0A0D0C;padding:10px 18px;border-radius:6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:600">Open in admin</a></p>
  </div>`;
}

export async function notifyAdminNewBooking(payload: NewBookingPayload): Promise<{ inApp: boolean; email: boolean }> {
  const result = { inApp: false, email: false };

  const title = `New booking — ${payload.guestName}`;
  const message = [
    `${payload.guestName}`,
    payload.roomName ? `· ${payload.roomName}` : "",
    `· ${payload.checkIn} → ${payload.checkOut}`,
    payload.amount ? `· ${payload.currency || "INR"} ${payload.amount.toLocaleString()}` : "",
    `· ref ${payload.ref}`,
  ].filter(Boolean).join(" ");

  try {
    const sql = getSql();
    await sql`
      INSERT INTO notifications (title, message, type, link, read, created_at)
      VALUES (${title}, ${message}, 'booking', ${`/admin/bookings?ref=${encodeURIComponent(payload.ref)}`}, false, now())
    `;
    result.inApp = true;
  } catch (e) {
    console.error("[notify] in-app notification insert failed:", e instanceof Error ? e.message : e);
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const adminEmail = await getAdminEmail();
      let propertyName = "Houseboat Canberra";
      try {
        const sql = getSql();
        const rows = await sql`SELECT value FROM settings WHERE key = 'hotel_name' LIMIT 1` as unknown as Array<{ value: string }>;
        if (rows[0]?.value) propertyName = rows[0].value;
      } catch { }
      const res = await sendEmail({
        to: adminEmail,
        subject: `New booking — ${payload.guestName} (${payload.ref})`,
        html: buildAdminEmailHtml(payload, propertyName),
      });
      result.email = !!res.ok;
      if (!res.ok) console.error("[notify] admin email send failed:", res.error);
    }
  } catch (e) {
    console.error("[notify] admin email threw:", e instanceof Error ? e.message : e);
  }

  return result;
}
