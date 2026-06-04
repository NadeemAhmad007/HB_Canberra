"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/Badge";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CalendarPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{ x: number; y: number; b: any } | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DAYS = daysInMonth;

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=bookings", { headers: h() }).then((r) => r.json()),
    ]).then(([r, b]) => { setRooms(Array.isArray(r) ? r : []); setBookings(Array.isArray(b) ? b : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!Array.isArray(rooms) || !rooms.length) return <EmptyState title="No rooms" />;

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const visible = safeBookings.filter((b: any) =>
    b.status !== "cancelled" &&
    b.check_in?.slice(0, 7) <= monthStr &&
    b.check_out?.slice(0, 7) >= monthStr
  );

  // Expand rooms into per-unit rows
  const unitRows = rooms.flatMap((room: any) =>
    Array.from({ length: room.units || 1 }, (_, ui) => ({
      id: `${room.id}-${ui + 1}`,
      roomId: room.id,
      label: room.units > 1 ? `${room.name} ${ui + 1}` : room.name,
      roomName: room.name,
    }))
  );

  const dayOffset = (d: number) => new Date(year, month, d).getDay();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Calendar</h1><p className="mt-1 text-sm text-white/50">Monthly view — hover for booking details</p></div>
        <div className="flex items-center gap-3">
          <button onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">←</button>
          <span className="text-sm font-light min-w-24 text-center">{MONTHS[month]} {year}</span>
          <button onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">→</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <div className="min-w-[800px]">
          <div className="flex bg-white/[0.02] border-b border-white/10 sticky top-0 z-20">
            <div className="w-44 shrink-0 px-4 py-3 text-[10px] uppercase tracking-wider text-white/40">Unit</div>
            {Array.from({ length: DAYS }).map((_, d) => (
              <div key={d} className="w-10 shrink-0 px-1 py-3 text-center text-[9px] text-white/30 border-l border-white/5">
                <div>{d + 1}</div>
                <div className="text-[8px] text-white/20">{["Su","Mo","Tu","We","Th","Fr","Sa"][dayOffset(d + 1)]}</div>
              </div>
            ))}
          </div>

          {unitRows.map((unit) => {
            const unitBookings = visible.filter((b: any) => b.room_name === unit.roomName);
            return (
              <div key={unit.id} className="flex border-b border-white/5 last:border-0">
                <div className="w-44 shrink-0 px-4 py-2.5 text-sm border-r border-white/5 flex items-center text-white/70">{unit.label}</div>
                <div className="flex relative min-h-[36px] flex-1">
                  {Array.from({ length: DAYS }).map((_, d) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                    const bOnDay = unitBookings.find((b: any) => dateStr >= b.check_in && dateStr < b.check_out);
                    const isStart = bOnDay && dateStr === bOnDay.check_in;
                    return (
                      <div key={d} className="w-10 shrink-0 border-l border-white/[0.02] relative" style={bOnDay ? { backgroundColor: "rgba(200,168,107,0.12)" } : undefined}>
                        {isStart && bOnDay && (
                          <div className="absolute inset-0 z-10 flex items-center px-1.5 cursor-pointer rounded-sm" style={{ backgroundColor: "rgba(200,168,107,0.35)", margin: 1 }}
                            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, b: bOnDay })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="text-[8px] text-white/90 truncate leading-none">{bOnDay.guest_name?.split(" ")[0]}</span>
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
