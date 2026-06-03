"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/Badge";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Modal } from "@/components/admin/Dialogs";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface BookingRow {
  id: string; booking_ref: string; guest_name: string; phone: string; email: string;
  room_name: string; check_in: string; check_out: string; adults: number; children: number;
  units: number; amount: number; status: string; created_at: string;
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=bookings", { headers: h() })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (ref: string, status: string) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "booking-status", data: { bookingRef: ref, status } }) });
    toast({ title: "Status updated", message: `Booking ${ref} set to ${status}`, type: "success" });
    fetchData();
  };

  const columns: Column<BookingRow>[] = [
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
      key: "status", label: "Status", render: (r) => (
        <Badge status={r.status} />
      ),
    },
    {
      key: "actions", label: "", sortable: false, render: (r) => (
        <div className="flex gap-2">
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
      <div>
        <h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Bookings</h1>
        <p className="mt-1 text-sm text-white/50">{data.length} total bookings</p>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onRowClick={setSelected} exportFilename="bookings.csv" />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Booking Details">
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Guest</span><p className="mt-1">{selected.guest_name}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Reference</span><p className="mt-1 font-mono text-[#C8A86B]">{selected.booking_ref}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Email</span><p className="mt-1">{selected.email || "—"}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-white/40">Phone</span><p className="mt-1">{selected.phone || "—"}</p></div>
            </div>
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
          </div>
        )}
      </Modal>
    </div>
  );
}
