"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Dialogs";
import { FileText, Plus } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ booking_ref: "", guest_name: "", items: "", subtotal: 0, tax: 0, total: 0 });
  const [taxRate, setTaxRate] = useState(0.12);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin?resource=invoices", { headers: h() }).then(r => r.json()),
      fetch("/api/admin?resource=bookings", { headers: h() }).then(r => r.json()),
    ]).then(([i, b]) => { setInvoices(Array.isArray(i) ? i : []); setBookings(Array.isArray(b) ? b : []); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    fetch("/api/admin?resource=settings", { headers: h() })
      .then(r => r.json())
      .then(s => {
        const raw = parseFloat(s.tax_rate);
        if (!isNaN(raw)) setTaxRate(raw / 100);
      })
      .catch(() => {});
  }, []);

  const createInvoice = async () => {
    const items = form.items ? form.items.split("\n").filter(Boolean).map((line: string) => {
      const parts = line.split(",");
      return { description: parts[0]?.trim() || "", amount: parseInt(parts[1]) || 0, qty: parseInt(parts[2]) || 1 };
    }) : [];
    const subtotal = items.reduce((s: number, i: any) => s + i.amount * i.qty, 0);
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;
    const invNo = "INV-" + Date.now();
    await fetch("/api/admin", { method: "POST", headers: h(), body: JSON.stringify({ resource: "invoice", data: { booking_ref: form.booking_ref, invoice_no: invNo, guest_name: form.guest_name, items, subtotal, tax, total, currency: "INR" } }) });
    toast({ title: "Invoice created", message: invNo, type: "success" });
    setShowCreate(false); setForm({ booking_ref: "", guest_name: "", items: "", subtotal: 0, tax: 0, total: 0 });
    fetchData();
  };

  const prefillFromBooking = (bookingRef: string) => {
    const b = bookings.find((x: any) => x.booking_ref === bookingRef);
    if (!b) return;
    const roomRate = Math.round((b.amount || 0) / Math.max(1, (b.nights || 1) * (b.units || 1)));
    const lines = [
      `${b.room_name || "Room"} × ${b.units} unit(s) × ${b.nights} night(s),${roomRate},${b.units * b.nights}`,
    ];
    if (b.meal_code) lines.push(`Meal plan (${b.meal_code}),0,1`);
    setForm({ ...form, booking_ref: bookingRef, guest_name: b.guest_name, items: lines.join("\n") });
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "invoice-status", data: { id, status } }) });
    toast({ title: "Status updated", type: "success" });
    fetchData();
  };

  const columns: Column<any>[] = [
    { key: "invoice_no", label: "Invoice", render: (r) => <span className="font-mono text-[#C8A86B] text-xs">{r.invoice_no}</span> },
    { key: "guest_name", label: "Guest" },
    { key: "booking_ref", label: "Booking", render: (r) => <span className="text-xs text-white/50">{r.booking_ref}</span> },
    { key: "total", label: "Amount", render: (r) => `₹${r.total?.toLocaleString()}` },
    { key: "status", label: "Status", render: (r) => {
      const c: Record<string, string> = { draft: "bg-white/10 text-white/50", sent: "bg-blue-500/20 text-blue-300", paid: "bg-emerald-500/20 text-emerald-300", cancelled: "bg-rose-500/20 text-rose-300" };
      return <span className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider ${c[r.status] || ""}`}>{r.status}</span>;
    }},
    { key: "created_at", label: "Date", render: (r) => <span className="text-xs text-white/50">{r.created_at?.slice(0, 10)}</span> },
    { key: "actions", label: "", sortable: false, render: (r) => (
      <select value="" onChange={(e) => { if (e.target.value) updateStatus(r.id, e.target.value); }} className="rounded-lg border border-white/10 bg-black px-2 py-1 text-[10px] uppercase tracking-wider text-white/70 outline-none">
        <option value="">Status</option>
        <option value="sent">Mark Sent</option>
        <option value="paid">Mark Paid</option>
        <option value="cancelled">Cancel</option>
      </select>
    )},
  ];

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Invoices</h1><p className="mt-1 text-sm text-white/50">{invoices.length} total</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black"><Plus className="h-3.5 w-3.5" /> Create Invoice</button>
      </div>
      {invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
        <DataTable columns={columns} data={invoices} loading={false} onRowClick={setSelected} exportFilename="invoices.csv" />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Invoice Details">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Invoice</span><p className="mt-1 font-mono text-[#C8A86B]">{selected.invoice_no}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guest</span><p className="mt-1">{selected.guest_name}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Booking</span><p className="mt-1">{selected.booking_ref}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span><p className="mt-1">₹{selected.total?.toLocaleString()}</p></div>
              </div>
              <a href={`/api/invoices/${selected.id}/pdf`} target="_blank" rel="noopener" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-wider text-white/80 hover:bg-white/10">Print / PDF</a>
            </div>
            {selected.items?.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Items</span>
                <table className="mt-2 w-full text-xs">
                  <thead><tr className="text-white/40 border-b border-white/10"><th className="py-1 text-left font-normal">Description</th><th className="py-1 text-right font-normal">Qty</th><th className="py-1 text-right font-normal">Amount</th></tr></thead>
                  <tbody>
                    {selected.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-white/5"><td className="py-1">{item.description}</td><td className="py-1 text-right">{item.qty}</td><td className="py-1 text-right">₹{(item.amount * item.qty).toLocaleString()}</td></tr>
                    ))}
                    <tr className="text-white/50"><td className="pt-2">Subtotal</td><td /><td className="pt-2 text-right">₹{selected.subtotal?.toLocaleString()}</td></tr>
                    <tr className="text-white/50"><td>Tax ({(taxRate * 100).toFixed(1)}%)</td><td /><td className="text-right">₹{selected.tax?.toLocaleString()}</td></tr>
                    <tr className="text-white font-medium"><td className="pb-0">Total</td><td /><td className="pb-0 text-right">₹{selected.total?.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice">
        <div className="space-y-4">
          <select value={form.booking_ref} onChange={(e) => {
            const v = e.target.value;
            setForm({ ...form, booking_ref: v, guest_name: bookings.find((x: any) => x.booking_ref === v)?.guest_name || "" });
            if (v) prefillFromBooking(v);
          }} className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none">
            <option value="" className="bg-black">Select booking</option>
            {bookings.map((b: any) => <option key={b.booking_ref} value={b.booking_ref} className="bg-black">{b.booking_ref} — {b.guest_name}</option>)}
          </select>
          <input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest name" className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Items (one per line: description,amount,qty) — Tax rate: {(taxRate * 100).toFixed(1)}%</span>
            <textarea value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} rows={5} placeholder="Room charges,11500,1&#10;Meal plan,1800,2&#10;Airport transfer,1500,1" className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none resize-none font-mono" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] uppercase tracking-wider text-white/60">Cancel</button>
            <button onClick={createInvoice} className="flex-1 rounded-xl bg-white py-2.5 text-[11px] uppercase tracking-wider text-black">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
