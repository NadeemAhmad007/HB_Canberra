import { Resend } from "resend";

let _resend: Resend | null = null;
function client() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  return _resend;
}

export function applyTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping send to", opts.to);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const from = opts.from || `Houseboat Canberra <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`;
    const res = await client().emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
    if ((res as any).error) return { ok: false, error: (res as any).error.message || "Resend error" };
    return { ok: true, id: (res as any).data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

export function settingsFromMap(settings: Record<string, string>) {
  return {
    propertyName: settings.hotel_name || "Houseboat Canberra",
    propertyEmail: settings.hotel_email || settings.property_email || "houseboat.canberra@gmail.com",
    propertyPhone: settings.hotel_phone || settings.property_phone || "+49 176 84005474",
    propertyWebsite: settings.hotel_website || settings.property_website || "https://hb-canberra.vercel.app",
  };
}
