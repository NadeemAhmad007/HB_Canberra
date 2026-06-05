import PDFDocument from "pdfkit";

function escape(s: any): string {
  return String(s ?? "");
}

function fmt(n: number): string {
  return "₹" + (n || 0).toLocaleString("en-IN");
}

function formatDate(d: any): string {
  if (!d) return "";
  const date = new Date(d);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(d).slice(0, 10);
}

export async function generateInvoicePdf(params: {
  invoice: any;
  booking: any;
  settings: Record<string, string>;
  bank: { bankName: string; accountName: string; accountNumber: string; ifsc: string; upiId?: string };
  paid: number;
}): Promise<Buffer> {
  const { invoice, booking, settings, bank, paid } = params;
  const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items || []);
  const hotelName = settings.hotel_name || "Houseboat Canberra";
  const hotelAddr = settings.hotel_address || "Gate no 13, Dal Lake Boulevard Road, Srinagar, 190001, Jammu & Kashmir, India";
  const hotelEmail = settings.hotel_email || "houseboat.canberra@gmail.com";
  const hotelPhone = settings.hotel_phone || "+49 176 84005474";
  const website = settings.hotel_website || "https://houseboatcanberra.com";
  const checkinTime = settings.checkin_time || "14:00";
  const checkoutTime = settings.checkout_time || "11:00";
  const taxRate = parseFloat(settings.tax_rate || "12");
  const total = invoice.total;
  const balance = total - paid;

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(buffers))));

  const gold = "#C8A86B";
  const dark = "#111111";
  const muted = "#666666";
  const GM = doc.page.width - 48;

  // ── Header ──────────────────────────────────────────────────────────
  doc.fontSize(20).font("Helvetica-Bold").fillColor(gold).text(hotelName.toUpperCase(), 48, 48, { characterSpacing: 3 });
  doc.fontSize(9).font("Helvetica").fillColor(muted).text(hotelAddr, 48, 74);
  doc.fontSize(9).fillColor(muted).text(`${hotelEmail} · ${hotelPhone}`, 48, 88);
  doc.fontSize(8).fillColor(gold).text(website, 48, 102);

  // Invoice title right-aligned
  doc.fontSize(26).font("Helvetica-Bold").fillColor(dark).text("INVOICE", GM, 48, { align: "right" });
  doc.fontSize(9).font("Helvetica").fillColor(muted).text(`No. ${invoice.invoice_no}`, GM, 78, { align: "right" });
  doc.fontSize(9).fillColor(muted).text(
    new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    GM, 92, { align: "right" }
  );
  doc.fontSize(8).fillColor(gold).text(invoice.status.toUpperCase(), GM, 108, { align: "right" });

  // Gold line
  doc.moveTo(48, 126).lineTo(GM, 126).strokeColor(gold).lineWidth(2).stroke();

  // ── Bill To / Booking ───────────────────────────────────────────────
  const billToY = 148;
  doc.fontSize(9).font("Helvetica").fillColor(muted).text("Billed to", 48, billToY);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(dark).text(escape(invoice.guest_name), 48, billToY + 14);
  let by = billToY + 30;
  if (booking?.email) { doc.fontSize(9).font("Helvetica").fillColor(muted).text(escape(booking.email), 48, by); by += 13; }
  if (booking?.phone) { doc.fontSize(9).font("Helvetica").fillColor(muted).text(escape(booking.phone), 48, by); by += 13; }

  doc.fontSize(9).fillColor(muted).text("Booking", GM, billToY, { align: "right" });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(dark).text(invoice.booking_ref, GM, billToY + 14, { align: "right" });
  if (booking) {
    doc.fontSize(9).font("Helvetica").fillColor(muted).text(
      `Stay: ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}`,
      GM, billToY + 30, { align: "right" }
    );
    doc.fontSize(9).fillColor(muted).text(
      `Check-in: ${checkinTime} • Check-out: ${checkoutTime}`,
      GM, billToY + 44, { align: "right" }
    );
  }

  // ── Items Table ─────────────────────────────────────────────────────
  const tableY = Math.max(by + 32, billToY + 70);
  doc.moveTo(48, tableY).lineTo(GM, tableY).strokeColor("#ddd").lineWidth(1).stroke();

  const colDesc = 48;
  const colQty = GM - 120;
  const colRate = GM - 68;
  const colAmt = GM;
  const colWidths = [colQty - colDesc, colRate - colQty, colAmt - colRate];

  doc.fontSize(8).font("Helvetica").fillColor(muted)
    .text("Description", colDesc, tableY + 6)
    .text("Qty", colQty, tableY + 6, { width: colWidths[0], align: "right" })
    .text("Rate", colRate, tableY + 6, { width: colWidths[1], align: "right" })
    .text("Amount", colAmt, tableY + 6, { width: colWidths[2], align: "right" });

  const headerBottom = tableY + 22;
  doc.moveTo(48, headerBottom).lineTo(GM, headerBottom).strokeColor("#eee").lineWidth(1).stroke();

  let rowY = headerBottom + 10;
  for (const it of items) {
    const amount = (it.amount || 0) * (it.qty || 1);
    doc.fontSize(10).font("Helvetica").fillColor(dark)
      .text(escape(it.description || ""), colDesc, rowY)
      .text(String(it.qty || 1), colQty, rowY, { width: colWidths[0], align: "right" })
      .text(fmt(it.amount || 0), colRate, rowY, { width: colWidths[1], align: "right" })
      .text(fmt(amount), colAmt, rowY, { width: colWidths[2], align: "right" });
    rowY += 20;
  }

  // ── Totals ──────────────────────────────────────────────────────────
  const totalsX = GM - 160;
  const totalY = Math.max(rowY + 12, tableY + 130);
  doc.fontSize(10).font("Helvetica").fillColor(muted).text("Subtotal", totalsX, totalY);
  doc.fontSize(10).fillColor(muted).text(fmt(invoice.subtotal), GM, totalY, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor(muted).text(`Tax (${taxRate}%)`, totalsX, totalY + 16);
  doc.fontSize(10).fillColor(muted).text(fmt(invoice.tax), GM, totalY + 16, { align: "right" });
  doc.moveTo(totalsX, totalY + 34).lineTo(GM, totalY + 34).strokeColor(dark).lineWidth(2).stroke();
  doc.fontSize(14).font("Helvetica-Bold").fillColor(dark).text("Total", totalsX, totalY + 38);
  doc.fontSize(14).font("Helvetica-Bold").fillColor(dark).text(fmt(total), GM, totalY + 38, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#0a7d3b").text("Paid", totalsX, totalY + 60);
  doc.fontSize(10).fillColor("#0a7d3b").text(fmt(paid), GM, totalY + 60, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor(dark).text("Balance due", totalsX, totalY + 76);
  doc.fontSize(10).fillColor(dark).text(fmt(balance), GM, totalY + 76, { align: "right" });

  // ── Bank Details (if balance > 0) ────────────────────────────────────
  if (balance > 0) {
    const bankY = totalY + 106;
    doc.rect(48, bankY, GM - 48, 64).fill("#f8f5ef");
    doc.fontSize(9).font("Helvetica-Bold").fillColor(gold).text("BANK TRANSFER DETAILS", 60, bankY + 8, { characterSpacing: 2 });
    doc.fontSize(9).font("Helvetica").fillColor(dark).text(
      `Bank: ${escape(bank.bankName)}  |  Account: ${escape(bank.accountName)}  |  No: ${escape(bank.accountNumber)}  |  IFSC: ${escape(bank.ifsc)}${bank.upiId ? `  |  UPI: ${escape(bank.upiId)}` : ""}`,
      60, bankY + 26, { width: GM - 72 }
    );
  }

  // ── Footer ──────────────────────────────────────────────────────────
  const footerY = doc.page.height - 100;
  doc.moveTo(48, footerY).lineTo(GM, footerY).strokeColor("#ddd").lineWidth(1).stroke();

  doc.fontSize(8).font("Helvetica").fillColor(muted)
    .text(hotelAddr, 48, footerY + 10)
    .text(`${hotelPhone} · ${hotelEmail} · ${website}`, 48, footerY + 24);

  doc.fontSize(8).fillColor(gold)
    .text(`Instagram  Facebook  WhatsApp`, 48, footerY + 40);

  doc.fontSize(7).fillColor("#999")
    .text(`${new Date().getFullYear()} — ${escape(hotelName)} — All rights reserved`, 48, footerY + 56);

  doc.end();
  return done;
}
