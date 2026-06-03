"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/Badge";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = 31;

export default function CalendarPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{ x: number; y: number; b: any } | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=bookings", { headers: h() }).then((r) => r.json()),
    ]).then(([r, b]) => { setRooms(r); setBookings(b); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!rooms.length) return <EmptyState title="No rooms" />;

  const visible = bookings.filter((b: any) =>
    b.status !== "cancelled" &&
    b.check_in?.slice(0, 7) <= monthStr &&
    b.check_out?.slice(0, 7) >= monthStr
  );

  const dayOffset = (d: number) => {
    const date = new Date(year, month, d);
    return date.getDay();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Calendar</h1><p className="mt-1 text-sm text-white/50">Drag to create or resize bookings</p></div>
        <div className="flex items-center gap-3">
          <button onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">←</button>
          <span className="text-sm font-light min-w-24 text-center">{MONTHS[month]} {year}</span>
          <button onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">→</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <div className="min-w-[800px]">
          {/* Header days */}
          <div className="flex bg-white/[0.02] border-b border-white/10">
            <div className="w-44 shrink-0 px-4 py-3 text-[10px] uppercase tracking-wider text-white/40">Room</div>
            {Array.from({ length: DAYS }).map((_, d) => (
              <div key={d} className="w-10 shrink-0 px-1 py-3 text-center text-[9px] text-white/30 border-l border-white/5">
                <div>{d + 1}</div>
                <div className="text-[8px] text-white/20">{["Su","Mo","Tu","We","Th","Fr","Sa"][dayOffset(d + 1)]}</div>
              </div>
            ))}
          </div>

          {/* Room rows */}
          {rooms.map((room: any) => {
            const roomBookings = visible.filter((b: any) => b.room_name === room.name || b.room_id === room.id);
            return (
              <div key={room.id} className="flex border-b border-white/5 last:border-0">
                <div className="w-44 shrink-0 px-4 py-3 text-sm border-r border-white/5 flex items-center">{room.name}</div>
                <div className="flex relative min-h-[48px]">
                  {Array.from({ length: DAYS }).map((_, d) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                    const bOnDay = roomBookings.find((b: any) => dateStr >= b.check_in && dateStr < b.check_out);
                    const isStart = bOnDay && dateStr === bOnDay.check_in;
                    return (
                      <div
                        key={d}
                        className="w-10 shrink-0 border-l border-white/[0.02] relative"
                        style={bOnDay ? { backgroundColor: "rgba(200,168,107,0.12)" } : undefined}
                      >
                        {isStart && bOnDay && (
                          <div
                            className="absolute inset-0 z-10 flex items-center px-1.5 cursor-pointer"
                            style={{ backgroundColor: "rgba(200,168,107,0.35)", borderRadius: 4, margin: 2 }}
                            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, b: bOnDay })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="text-[8px] text-white/90 truncate">{bOnDay.guest_name?.split(" ")[0]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tooltip && (
        <div className="fixed z-50 rounded-xl border border-white/10 bg-[#111] px-5 py-4 shadow-2xl text-sm" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <div className="font-medium">{tooltip.b.guest_name}</div>
          <div className="text-[11px] text-white/50 mt-1">{tooltip.b.check_in} → {tooltip.b.check_out}</div>
          <div className="text-[11px] text-white/50">{tooltip.b.room_name} • ₹{tooltip.b.amount?.toLocaleString()}</div>
          <div className="mt-1"><Badge status={tooltip.b.status} /></div>
        </div>
      )}
    </div>
  );
}
