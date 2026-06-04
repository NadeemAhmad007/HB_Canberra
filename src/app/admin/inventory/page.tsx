"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

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
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);
  const [viewDays, setViewDays] = useState(30);
  const { toast } = useToast();

  const nextDays = Array.from({ length: viewDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + startIndex + i);
    return d.toISOString().slice(0, 10);
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=bookings", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=blocked-dates", { headers: h() }).then((r) => r.json()),
    ]).then(([r, b, bl]) => {
      setRooms(Array.isArray(r) ? r : []);
      setBookings(Array.isArray(b) ? b : []);
      setBlockedDates(Array.isArray(bl) ? bl : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeBlocked = Array.isArray(blockedDates) ? blockedDates : [];

  // Expand rooms into per-unit rows
  const unitRows = rooms.flatMap((room: any) =>
    Array.from({ length: room.units || 1 }, (_, ui) => ({
      id: `${room.id}-${ui + 1}`,
      roomId: room.id,
      label: room.units > 1 ? `${room.name} ${ui + 1}` : room.name,
      roomName: room.name,
    }))
  );

  const statusFor = (roomId: number, roomName: string, date: string): string => {
    const isBlocked = safeBlocked.some((bd: any) => parseInt(bd.room_id) === roomId && bd.date === date);
    if (isBlocked) return "blocked";
    const b = safeBookings.find((x: any) =>
      x.room_name === roomName &&
      x.status !== "cancelled" &&
      x.status !== "checked-out" &&
      date >= x.check_in && date < x.check_out
    );
    if (b) return b.status === "checked-in" ? "occupied" : "reserved";
    return "available";
  };

  const toggleBlock = async (roomId: number, date: string) => {
    const isBlocked = safeBlocked.some((bd: any) => parseInt(bd.room_id) === roomId && bd.date === date);
    const current: Record<string, string[]> = {};
    rooms.forEach((r: any) => { current[r.id] = []; });
    safeBlocked.forEach((bd: any) => {
      const rid = parseInt(bd.room_id) || bd.room_id;
      if (!current[rid]) current[rid] = [];
      current[rid].push(bd.date);
    });
    if (isBlocked) {
      current[roomId] = (current[roomId] || []).filter((d: string) => d !== date);
    } else {
      if (!current[roomId]) current[roomId] = [];
      current[roomId].push(date);
    }
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "blocked-dates", data: current }) });
    toast({ title: isBlocked ? "Date unblocked" : "Date blocked", type: "success" });
    fetchData();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!Array.isArray(rooms) || !rooms.length) return <EmptyState title="No rooms" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Inventory</h1><p className="mt-1 text-sm text-white/50">Click a date to block/unblock that room type</p></div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {[14, 30, 60].map((d) => (
              <button key={d} onClick={() => { setViewDays(d); setStartIndex(0); }} className={`px-4 py-2 text-[11px] uppercase tracking-wider ${viewDays === d ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}>{d}d</button>
            ))}
          </div>
          <button onClick={() => setStartIndex(Math.max(0, startIndex - viewDays))} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-[11px] text-white/50 min-w-20 text-center">{nextDays[0]} — {nextDays[nextDays.length - 1]}</span>
          <button onClick={() => setStartIndex(startIndex + viewDays)} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex gap-4 text-[10px] uppercase tracking-wider flex-wrap">
        {STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-2"><span className={`inline-block h-3 w-3 rounded ${STATUS_COLORS[s]}`} />{s}</span>
        ))}
        <span className="flex items-center gap-1 text-white/30 ml-auto"><Lock className="h-3 w-3" /> Click date to toggle block</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-normal w-40 sticky left-0 bg-[#0A0D0C] z-10">Unit</th>
              {nextDays.map((d) => (
                <th key={d} className="px-1 py-3 text-[9px] text-white/40 font-normal text-center w-9">
                  {new Date(d).getDate()}
                  <div className="text-[7px] text-white/20">{["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(d).getDay()]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unitRows.map((unit) => {
              const st = "available";
              return (
                <tr key={unit.id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 text-white/70 text-xs sticky left-0 bg-[#0A0D0C] z-10">{unit.label}</td>
                  {nextDays.map((d) => {
                    const cellStatus = statusFor(unit.roomId, unit.roomName, d);
                    return (
                      <td key={d} onClick={() => toggleBlock(unit.roomId, d)}
                        className={`px-1 py-2.5 text-center ${STATUS_COLORS[cellStatus]} border-l border-white/[0.02] cursor-pointer hover:ring-1 hover:ring-white/20 transition`}
                        title={cellStatus === "blocked" ? "Click to unblock" : "Click to block"}
                      >
                        <span className="text-[8px] text-white/50">
                          {cellStatus === "available" ? "✓" : cellStatus === "occupied" ? "●" : cellStatus === "reserved" ? "○" : "🔒"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
