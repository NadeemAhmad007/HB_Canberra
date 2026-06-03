"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const STATUSES = ["available", "reserved", "occupied", "blocked", "maintenance"] as const;
const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/20",
  reserved: "bg-blue-500/20",
  occupied: "bg-amber-500/20",
  blocked: "bg-rose-500/20",
  maintenance: "bg-gray-500/20",
};

export default function InventoryPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const nextDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=bookings", { headers: h() }).then((r) => r.json()),
    ]).then(([r, b]) => { setRooms(r); setBookings(b); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusFor = (roomId: number, roomName: string, date: string): string => {
    const b = bookings.find((x: any) =>
      x.room_name === roomName &&
      x.status !== "cancelled" &&
      x.status !== "checked-out" &&
      date >= x.check_in && date < x.check_out
    );
    if (b) return b.status === "checked-in" ? "occupied" : "reserved";
    return "available";
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!rooms.length) return <EmptyState title="No rooms" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Inventory</h1><p className="mt-1 text-sm text-white/50">14-day occupancy view</p></div>

      <div className="flex gap-3 text-[10px] uppercase tracking-wider">
        {STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-2"><span className={`inline-block h-3 w-3 rounded ${STATUS_COLORS[s]}`} />{s}</span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-normal w-40">Room</th>
              {nextDays.map((d) => (
                <th key={d} className="px-2 py-3 text-[9px] text-white/40 font-normal text-center w-10">
                  {new Date(d).getDate()}
                  <div className="text-[8px] text-white/20">{["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(d).getDay()]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room: any) => (
              <tr key={room.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/80 text-xs">{room.name}</td>
                {nextDays.map((d) => {
                  const st = statusFor(room.id, room.name, d);
                  return (
                    <td key={d} className={`px-2 py-3 text-center ${STATUS_COLORS[st]} border-l border-white/[0.02]`}>
                      <span className="text-[8px] text-white/40">{st === "available" ? "✓" : st === "occupied" ? "●" : st === "reserved" ? "○" : "—"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
