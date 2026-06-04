import { NextResponse } from "next/server";
import { getInvoiceById, getBookingByRef, getSettings, getTotalPaid } from "@/lib/db";
import { getBankDetails } from "@/lib/payments";

function escape(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function fmt(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const invoice = await getInvoiceById(id).catch(() => null);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const booking = await getBookingByRef(invoice.booking_ref).catch(() => null);
  const settings = await getSettings().catch(() => ({} as Record<string, string>));
  const paid = await getTotalPaid(invoice.booking_ref).catch(() => 0);
  const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items || []);
  const bank = getBankDetails(settings);

  const hotelName = settings.hotel_name || "Houseboat Canberra";
  const hotelAddr = settings.hotel_address || "Dal Lake, Srinagar";
  const hotelEmail = settings.hotel_email || "houseboat.canberra@gmail.com";
  const hotelPhone = settings.hotel_phone || "+49 176 84005474";
  const taxRate = parseFloat(settings.tax_rate || "12");

  const subtotal = invoice.subtotal;
  const tax = invoice.tax;
  const total = invoice.total;
  const balance = total - paid;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Invoice ${escape(invoice.invoice_no)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, serif; color: #111; background: #fff; margin: 0; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1, h2, h3, h4 { font-weight: 400; margin: 0; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .muted { color: #666; font-size: 12px; }
  .head { border-bottom: 2px solid #C8A86B; padding-bottom: 20px; margin-bottom: 24px; }
  .brand { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; color: #C8A86B; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 400; }
  td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals td { border: 0; }
  .totals .grand { font-size: 18px; border-top: 2px solid #111; padding-top: 8px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  .stamp { display: inline-block; padding: 4px 10px; border: 1px solid #C8A86B; color: #C8A86B; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; }
  @media print { body { padding: 16px; } }
</style></head>
<body>
  <div class="head row">
    <div>
      <div class="brand">${escape(hotelName)}</div>
      <div class="muted">${escape(hotelAddr)}</div>
      <div class="muted">${escape(hotelEmail)} · ${escape(hotelPhone)}</div>
    </div>
    <div style="text-align:right">
      <h2 style="font-size:28px;letter-spacing:4px">INVOICE</h2>
      <div class="muted">No. ${escape(invoice.invoice_no)}</div>
      <div class="muted">${escape(new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))}</div>
      <div style="margin-top:8px"><span class="stamp">${escape(invoice.status)}</span></div>
    </div>
  </div>

  <div class="row" style="margin-bottom: 24px">
    <div>
      <div class="muted">Billed to</div>
      <div style="font-size:14px;margin-top:4px">${escape(invoice.guest_name)}</div>
      ${booking?.email ? `<div class="muted">${escape(booking.email)}</div>` : ""}
      ${booking?.phone ? `<div class="muted">${escape(booking.phone)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="muted">Booking</div>
      <div style="font-family:monospace;margin-top:4px">${escape(invoice.booking_ref)}</div>
      ${booking ? `<div class="muted" style="margin-top:8px">Stay: ${escape(booking.check_in)} → ${escape(booking.check_out)}</div>` : ""}
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${items.map((it: any) => `<tr>
        <td>${escape(it.description)}</td>
        <td class="num">${escape(it.qty || 1)}</td>
        <td class="num">${fmt(it.amount)}</td>
        <td class="num">${fmt((it.amount || 0) * (it.qty || 1))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <table class="totals" style="width: 50%; margin-left: 50%;">
    <tr><td class="muted">Subtotal</td><td class="num">${fmt(subtotal)}</td></tr>
    <tr><td class="muted">Tax (${taxRate}%)</td><td class="num">${fmt(tax)}</td></tr>
    <tr class="grand"><td><strong>Total</strong></td><td class="num"><strong>${fmt(total)}</strong></td></tr>
    <tr><td class="muted">Paid</td><td class="num" style="color:#0a7d3b">${fmt(paid)}</td></tr>
    <tr><td class="muted">Balance due</td><td class="num">${fmt(balance)}</td></tr>
  </table>

  ${balance > 0 ? `<div style="margin-top:24px;padding:16px;background:#f8f5ef;border:1px solid #C8A86B;border-radius:6px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C8A86B;margin-bottom:8px">Bank transfer details</div>
    <div style="font-size:12px;line-height:1.7">Bank: <strong>${escape(bank.bankName)}</strong><br/>Account: <strong>${escape(bank.accountName)}</strong><br/>No: <strong>${escape(bank.accountNumber)}</strong><br/>IFSC: <strong>${escape(bank.ifsc)}</strong>${bank.upiId ? `<br/>UPI: <strong>${escape(bank.upiId)}</strong>` : ""}</div>
  </div>` : ""}

  <div class="footer">
    Thank you for choosing ${escape(hotelName)}. We look forward to hosting you.
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
