import { neon } from "@neondatabase/serverless";
import { applyTemplate, sendEmail, brandedEmailHtml, settingsFromMap } from "./email";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

async function getSettings(): Promise<Record<string, string>> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT key, value FROM settings` as unknown as Array<{ key: string; value: string }>;
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch { return {}; }
}

async function getTemplate(event: string): Promise<{ subject: string; body: string } | null> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT subject, body FROM email_templates WHERE trigger_event = ${event} AND active = true LIMIT 1` as unknown as Array<{ subject: string; body: string }>;
    return rows[0] || null;
  } catch { return null; }
}

async function sendTemplate(template: { subject: string; body: string }, booking: any, settings: Record<string, string>, to: string): Promise<boolean> {
  const info = settingsFromMap(settings);
  const address = settings.hotel_address || "Gate no 13, Dal Lake Boulevard Road, Srinagar, 190001, Jammu & Kashmir, India";
  const vars: Record<string, string> = {
    guest_name: booking.guest_name || "Guest",
    booking_ref: booking.booking_ref || "",
    check_in: booking.check_in ? String(booking.check_in).slice(0, 10) : "",
    check_out: booking.check_out ? String(booking.check_out).slice(0, 10) : "",
    room_name: booking.room_name || "Room",
    amount: String(booking.amount || 0),
    property_email: info.propertyEmail,
    property_phone: info.propertyPhone,
    property_website: info.propertyWebsite,
    property_address: address,
    property_name: info.propertyName,
  };
  const bodyHtml = applyTemplate(template.body, vars).replace(/\n/g, "<br>");
  const html = brandedEmailHtml(bodyHtml, {
    ...info,
    propertyAddress: address,
  });
  const res = await sendEmail({ to, subject: template.subject, html });
  return !!res.ok;
}

export async function sendCheckinReminders(): Promise<{ sent: number; errors: number }> {
  let sent = 0, errors = 0;
  try {
    const sql = getSql();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const bookings = await sql`
      SELECT b.*, r.name AS room_name
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.check_in = ${dateStr}::date AND b.status = 'confirmed'
    ` as unknown as any[];
    if (bookings.length === 0) return { sent, errors };
    const template = await getTemplate("checkin_reminder");
    if (!template) return { sent, errors };
    const settings = await getSettings();
    for (const b of bookings) {
      if (!b.email) continue;
      try {
        const ok = await sendTemplate(template, b, settings, b.email);
        if (ok) sent++; else errors++;
      } catch { errors++; }
    }
  } catch { errors++; }
  return { sent, errors };
}

export async function sendPostStayFollowups(): Promise<{ sent: number; errors: number }> {
  let sent = 0, errors = 0;
  try {
    const sql = getSql();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const bookings = await sql`
      SELECT b.*, r.name AS room_name
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.check_out = ${dateStr}::date AND b.status = 'checked-out'
    ` as unknown as any[];
    if (bookings.length === 0) return { sent, errors };
    const template = await getTemplate("post_stay");
    if (!template) return { sent, errors };
    const settings = await getSettings();
    for (const b of bookings) {
      if (!b.email) continue;
      try {
        const ok = await sendTemplate(template, b, settings, b.email);
        if (ok) sent++; else errors++;
      } catch { errors++; }
    }
  } catch { errors++; }
  return { sent, errors };
}
