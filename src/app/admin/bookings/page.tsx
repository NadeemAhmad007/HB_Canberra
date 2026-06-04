"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge, paymentStatusColors } from "@/components/admin/Badge";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Modal } from "@/components/admin/Dialogs";
import { useToast } from "@/components/admin/Toast";
import { CheckSquare, Square, DollarSign } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface BookingRow {
  id: string; booking_ref: string; guest_name: string; phone: string; email: string;
  room_name: string; check_in: string; check_out: string; adults: number; children: number;
  units: number; amount: number; status: string; created_at: string; notes?: string;
  payment_status?: string; payment_gateway?: string; payment_id?: string;
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

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
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Marked as paid", message: ref, type: "success" });
    } catch {
      toast({ title: "Failed", message: "Could not mark as paid", type: "error" });
    }
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
          </div>
        )}
      </Modal>
    </div>
  );
}
