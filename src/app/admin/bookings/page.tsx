"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge, paymentStatusColors } from "@/components/admin/Badge";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Modal } from "@/components/admin/Dialogs";
import { useToast } from "@/components/admin/Toast";
import { usePoll } from "@/lib/usePoll";
import { CheckSquare, Square, DollarSign } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface BookingRow {
  id: string; booking_ref: string; guest_name: string; phone: string; email: string;
  room_name: string; check_in: string; check_out: string; adults: number; children: number;
  units: number; amount: number; status: string; created_at: string; notes?: string;
  payment_status?: string; payment_gateway?: string; payment_id?: string;
  amount_paid?: number; deposit_required?: boolean; deposit_amount?: number;
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState<BookingRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("bank");
  const [payRef, setPayRef] = useState("");
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=bookings", { headers: h() })
      .then((r) => r.json())
      .then((d) => { setData(Array.isArray(d) ? d : []); setSelectedRefs(new Set()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  usePoll(fetchData, 60000, true);

  const toggleSelect = (ref: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRefs.size === data.length) setSelectedRefs(new Set());
    else setSelectedRefs(new Set(data.map((d) => d.booking_ref)));
  };

  const updateStatus = async (ref: string, status: string) => {
    try {
      const res = await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "booking-status", data: { bookingRef: ref, status } }) });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Status updated", message: `Booking ${ref} set to ${status}`, type: "success" });
    } catch {
      toast({ title: "Update failed", message: `Could not update ${ref}`, type: "error" });
    }
    fetchData();
  };

  const bulkUpdate = async (status: string) => {
    if (selectedRefs.size === 0) { toast({ title: "No bookings selected", type: "warning" }); return; }
    const refs = Array.from(selectedRefs);
    try {
      const res = await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "bulk-booking-status", data: { refs, status } }) });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Bulk update", message: `${refs.length} bookings → ${status}`, type: "success" });
    } catch {
      toast({ title: "Bulk update failed", message: `Could not update ${refs.length} bookings`, type: "error" });
    }
    fetchData();
  };

  const markAsPaid = async (ref: string) => {
    try {
      const res = await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "mark-paid", data: { bookingRef: ref } }) });
      if (!res.ok) {
        const body = await res.text();
        toast({ title: "Failed", message: `${res.status}: ${body.slice(0, 200)}`, type: "error" });
        return;
      }
      toast({ title: "Marked as paid", message: ref, type: "success" });
    } catch (e) {
      toast({ title: "Failed", message: e instanceof Error ? e.message : "Could not mark as paid", type: "error" });
    }
    fetchData();
  };

  const recordPayment = (b: BookingRow) => {
    const outstanding = (b.amount || 0) - (b.amount_paid || 0);
    setRecording(b);
    setPayAmount(outstanding);
    setPayMethod("bank");
    setPayRef("");
  };

  const submitPayment = async () => {
    if (!recording) return;
    const res = await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "record-payment", data: { bookingRef: recording.booking_ref, amount: payAmount, method: payMethod, reference: payRef } }) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast({ title: "Failed", message: body.error || "Could not record", type: "error" });
      return;
    }
    toast({ title: "Payment recorded", message: `₹${payAmount.toLocaleString()}`, type: "success" });
    setRecording(null);
    fetchData();
  };

  const gatewayIcon = (g?: string) => {
    if (g === "bank") return "🏦";
    return "";
  };

  const columns: Column<BookingRow>[] = [
    {
      key: "_select", label: "", sortable: false, render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); toggleSelect(r.booking_ref); }} className="text-white/30 hover:text-white transition">
          {selectedRefs.has(r.booking_ref) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
      ),
    },
    { key: "booking_ref", label: "Ref", width: "120px" },
    {
      key: "guest_name", label: "Guest", render: (r) => (
        <div><div>{r.guest_name}</div><div className="text-[10px] text-white/40">{r.phone || r.email}</div></div>
      ),
    },
    { key: "room_name", label: "Room" },
    { key: "check_in", label: "Check-in" },
    { key: "check_out", label: "Check-out" },
    { key: "nights", label: "Nights" },
    {
      key: "guests", label: "Guests", render: (r) => `${r.adults}A${r.children > 0 ? ` ${r.children}C` : ""} ×${r.units}`,
    },
    {
      key: "amount", label: "Amount", render: (r) => `₹${r.amount?.toLocaleString()}`,
    },
    {
      key: "payment_status", label: "Payment", render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-medium ${paymentStatusColors[r.payment_status || ""] || "bg-white/10 text-white/60 border-white/10"}`}>
            {gatewayIcon(r.payment_gateway)}{r.payment_status || "pending"}
          </span>
        </div>
      ),
    },
    {
      key: "status", label: "Status", render: (r) => (
        <Badge status={r.status} />
      ),
    },
    {
      key: "actions", label: "", sortable: false, render: (r) => (
        <div className="flex gap-2">
          {(!r.payment_status || r.payment_status === "pending") && (
            <button onClick={(e) => { e.stopPropagation(); markAsPaid(r.booking_ref); }} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20"><DollarSign className="h-3 w-3 inline" /> Pay</button>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) updateStatus(r.booking_ref, e.target.value); }}
            className="rounded-lg border border-white/10 bg-black px-2 py-1 text-[10px] uppercase tracking-wider text-white/70 outline-none"
          >
            <option value="">Actions</option>
            <option value="confirmed">Confirm</option>
            <option value="checked-in">Check in</option>
            <option value="checked-out">Check out</option>
            <option value="cancelled">Cancel</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Bookings</h1>
          <p className="mt-1 text-sm text-white/50">{Array.isArray(data) ? data.length : 0} total bookings</p>
        </div>
        {selectedRefs.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2">
            <span className="text-[11px] text-white/50">{selectedRefs.size} selected</span>
            <select value="" onChange={(e) => { if (e.target.value) bulkUpdate(e.target.value); }} className="rounded-lg border border-white/10 bg-black px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/70 outline-none">
              <option value="">Bulk action</option>
              <option value="confirmed">Confirm all</option>
              <option value="checked-in">Check in all</option>
              <option value="checked-out">Check out all</option>
              <option value="cancelled">Cancel all</option>
            </select>
            <button onClick={() => setSelectedRefs(new Set())} className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white">Clear</button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={setSelected}
        exportFilename="bookings.csv"
        headerExtra={
          <button onClick={(e) => { e.stopPropagation(); toggleAll(); }} className="text-white/30 hover:text-white transition">
            {selectedRefs.size === data.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
        }
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Booking Details">
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guest</span><p className="mt-1">{selected.guest_name}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Reference</span><p className="mt-1 font-mono text-[#C8A86B]">{selected.booking_ref}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Email</span><p className="mt-1">{selected.email || "—"}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Phone</span><p className="mt-1">{selected.phone || "—"}</p></div>
            </div>
            {(selected.payment_status || selected.payment_gateway) && (
              <div className="border-t border-white/10 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Payment</span>
                <div className="mt-1 flex items-center gap-3">
                  <span className={`inline-block rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider font-medium ${paymentStatusColors[selected.payment_status || "pending"] || "bg-white/10 text-white/60 border-white/10"}`}>
                    {selected.payment_status || "pending"}
                  </span>
                  <span className="text-[11px] text-white/50 capitalize">{selected.payment_gateway || "—"}</span>
                  {selected.payment_id && <span className="text-[10px] font-mono text-white/30">{selected.payment_id.slice(0, 20)}...</span>}
                </div>
              </div>
            )}
            <div className="border-t border-white/10 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Room</span><p className="mt-1">{selected.room_name} ×{selected.units}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Status</span><p className="mt-1"><Badge status={selected.status} /></p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Check-in</span><p className="mt-1">{selected.check_in}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Check-out</span><p className="mt-1">{selected.check_out}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guests</span><p className="mt-1">{selected.adults} adults, {selected.children} children</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span><p className="mt-1">₹{selected.amount?.toLocaleString()}</p></div>
              </div>
            </div>
            {(selected as any).notes && (
              <div className="border-t border-white/10 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Notes</span>
                <p className="mt-1 text-white/70">{(selected as any).notes}</p>
              </div>
            )}
            {selected.amount_paid !== undefined && (selected.amount_paid || 0) < (selected.amount || 0) && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Balance</div>
                    <div className="mt-1 text-amber-300">₹{((selected.amount || 0) - (selected.amount_paid || 0)).toLocaleString()} of ₹{(selected.amount || 0).toLocaleString()}</div>
                  </div>
                  <button onClick={() => recordPayment(selected)} className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/25">Record payment</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!recording} onClose={() => setRecording(null)} title={`Record payment — ${recording?.booking_ref || ""}`}>
        {recording && (
          <div className="space-y-4">
            <div className="text-[11px] text-white/50">Outstanding: <span className="text-amber-300">₹{((recording.amount || 0) - (recording.amount_paid || 0)).toLocaleString()}</span></div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Amount (INR)</label>
              <input type="number" min={1} max={(recording.amount || 0) - (recording.amount_paid || 0)} value={payAmount} onChange={(e) => setPayAmount(parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none">
                <option value="bank">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40">Reference / note (optional)</label>
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / txn id / note" className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRecording(null)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] uppercase tracking-wider text-white/60">Cancel</button>
              <button onClick={submitPayment} disabled={payAmount <= 0} className="flex-1 rounded-xl bg-white py-2.5 text-[11px] uppercase tracking-wider text-black disabled:opacity-40">Record</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
