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
  attachments?: { filename: string; content: Buffer }[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping send to", opts.to);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const fallback = process.env.EMAIL_FROM || "onboarding@resend.dev";
    const from = opts.from || (fallback.includes("<") ? fallback : `Houseboat Canberra <${fallback}>`);
    const payload: any = { from, to: opts.to, subject: opts.subject, html: opts.html };
    if (opts.attachments?.length) {
      payload.attachments = opts.attachments.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      }));
    }
    const res = await client().emails.send(payload);
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function brandedEmailHtml(bodyHtml: string, vars: {
  subject?: string;
  propertyName?: string;
  propertyEmail?: string;
  propertyPhone?: string;
  propertyWebsite?: string;
  propertyAddress?: string;
}): string {
  const name = vars.propertyName || "Houseboat Canberra";
  const email = vars.propertyEmail || "houseboat.canberra@gmail.com";
  const phone = vars.propertyPhone || "+49 176 84005474";
  const website = vars.propertyWebsite || "https://houseboatcanberra.com";
  const address = vars.propertyAddress || "Gate no 13, Dal Lake Boulevard Road, Srinagar, 190001, Jammu and Kashmir, India";

  const logoUrl = `${website}/HB_Logo.png`;
  const mapsUrl = `https://maps.google.com/?q=${escapeHtml(address)}`;
  const instagramUrl = "https://www.instagram.com/houseboatcanberra";
  const facebookUrl = "https://www.facebook.com/people/Houseboat-Canberra/61553670362440/";
  const whatsappUrl = `https://wa.me/4917684005474?text=Hi%2C%20I'd%20like%20to%20know%20more%20about%20Houseboat%20Canberra.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @media only screen and (max-width:600px){
    .container{width:100%!important;padding:20px 16px!important}
    .logo{width:120px!important;height:120px!important}
    .footer-grid{grid-template-columns:1fr!important}
    h1{font-size:18px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#050A18;font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050A18;padding:32px 0">
<tr><td align="center">
<table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0A0D0C;border-radius:16px;overflow:hidden">

  <!-- Logo + Name -->
  <tr><td style="padding:36px 40px 20px;text-align:center">
    <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" width="180" height="180" style="width:180px;height:180px;border-radius:50%;display:block;margin:0 auto 12px">
    <div style="font-size:15px;letter-spacing:4px;text-transform:uppercase;color:#C8A86B;font-weight:400">${escapeHtml(name)}</div>
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:4px">Luxury Afloat — Dal Lake</div>
  </td></tr>

  <!-- Gold Divider -->
  <tr><td style="padding:0 40px"><div style="height:1px;background:linear-gradient(90deg,transparent,#C8A86B,transparent)"></div></td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 40px 32px;color:#fff;font-size:14px;line-height:1.7">
    ${bodyHtml}
  </td></tr>

  <!-- Gold Divider -->
  <tr><td style="padding:0 40px"><div style="height:1px;background:linear-gradient(90deg,transparent,#C8A86B,transparent)"></div></td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 36px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;padding-right:20px;padding-bottom:16px">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:6px">Address</div>
          <div><a href="${escapeHtml(mapsUrl)}" target="_blank" style="color:rgba(255,255,255,0.65);text-decoration:none;font-size:12px">${escapeHtml(address)}</a></div>
          <div style="margin-top:4px"><a href="${escapeHtml(mapsUrl)}" target="_blank" style="color:#C8A86B;font-size:10px;text-decoration:none;text-transform:uppercase;letter-spacing:1px">Open in Google Maps →</a></div>
        </td>
        <td style="vertical-align:top;padding-bottom:16px">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:6px">Contact</div>
          <div><a href="tel:${escapeHtml(phone)}" style="color:#C8A86B;text-decoration:none">${escapeHtml(phone)}</a></div>
          <div><a href="mailto:${escapeHtml(email)}" style="color:#C8A86B;text-decoration:none">${escapeHtml(email)}</a></div>
          <div><a href="${escapeHtml(website)}" style="color:#C8A86B;text-decoration:none">${escapeHtml(website)}</a></div>
        </td>
      </tr>
    </table>

    <!-- Social + WhatsApp -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
      <tr>
        <td style="padding-bottom:16px">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px">Follow us</div>
          <a href="${escapeHtml(instagramUrl)}" target="_blank" style="display:inline-block;color:#C8A86B;font-size:12px;text-decoration:none;margin-right:16px">Instagram →</a>
          <a href="${escapeHtml(facebookUrl)}" target="_blank" style="display:inline-block;color:#C8A86B;font-size:12px;text-decoration:none">Facebook →</a>
        </td>
        <td style="text-align:right;padding-bottom:16px">
          <a href="${escapeHtml(whatsappUrl)}" target="_blank" style="display:inline-block;background:rgba(200,168,107,0.12);border:1px solid rgba(200,168,107,0.25);padding:8px 14px;border-radius:8px;color:#C8A86B;font-size:11px;text-decoration:none;letter-spacing:1px;text-transform:uppercase">Chat on WhatsApp</a>
        </td>
      </tr>
    </table>

    <!-- Copyright -->
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;margin-top:4px;font-size:10px;color:rgba(255,255,255,0.25);text-align:center;letter-spacing:1px;text-transform:uppercase">
      ${new Date().getFullYear()} — ${escapeHtml(name)} — All rights reserved
    </div>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}
