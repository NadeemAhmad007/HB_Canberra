import { neon } from "@neondatabase/serverless";
import { sendEmail, brandedEmailHtml } from "./email";

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

function buildAdminBodyHtml(p: NewBookingPayload): string {
  const cur = p.currency || "INR";
  const amt = p.amount ? `${cur} ${p.amount.toLocaleString()}` : "—";
  const nights = p.nights ?? 1;
  const adminUrl = process.env.ADMIN_URL || "https://houseboatcanberra.com/admin/bookings";
  return `
    <div style="margin-bottom:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C8A86B">New booking · via ${p.source}</div>
    <h1 style="font-size:22px;font-weight:400;color:#fff;margin:8px 0 4px">${p.guestName}</h1>
    <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 20px">Ref <strong style="color:#C8A86B;font-family:monospace">${p.ref}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;width:40%">Room</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${p.roomName || "Room"}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-in</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${p.checkIn}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Check-out</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${p.checkOut}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Nights</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff">${nights}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Total</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#fff"><strong>${amt}</strong></td></tr>
      ${p.guestEmail ? `<tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Guest email</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px"><a href="mailto:${p.guestEmail}" style="color:#C8A86B">${p.guestEmail}</a></td></tr>` : ""}
      ${p.guestPhone ? `<tr><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Guest phone</td><td style="padding:8px 12px;border:1px solid rgba(255,255,255,0.08);font-size:13px"><a href="tel:${p.guestPhone}" style="color:#C8A86B">${p.guestPhone}</a></td></tr>` : ""}
    </table>
    <p style="margin:0"><a href="${adminUrl}" style="display:inline-block;background:#C8A86B;color:#0A0D0C;padding:10px 20px;border-radius:6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:600">Open in admin</a></p>
  `;
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
      const bodyHtml = buildAdminBodyHtml(payload);
      const res = await sendEmail({
        to: adminEmail,
        subject: `New booking — ${payload.guestName} (${payload.ref})`,
        html: brandedEmailHtml(bodyHtml, { propertyName, propertyEmail: adminEmail }),
      });
      result.email = !!res.ok;
      if (!res.ok) console.error("[notify] admin email send failed:", res.error);
    }
  } catch (e) {
    console.error("[notify] admin email threw:", e instanceof Error ? e.message : e);
  }

  return result;
}
