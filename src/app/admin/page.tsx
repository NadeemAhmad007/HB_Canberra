"use client";

import { useState, useEffect } from "react";
import { Building2, Users, CalendarCheck, CalendarX, BedDouble, Activity, IndianRupee, TrendingUp, Sparkles } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/Badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const token = () => sessionStorage.getItem("admin_token") || "";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin?resource=dashboard", { headers: headers() })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!data || !Array.isArray(data?.bookings)) return <EmptyState title="Could not load dashboard" />;

  const bookings = data.bookings;
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const totalRooms = rooms.reduce((s: number, r: any) => s + r.units, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckins = bookings.filter((b: any) => b.check_in === today && b.status !== "cancelled").length;
  const todayCheckouts = bookings.filter((b: any) => b.check_out === today && b.status !== "cancelled").length;
  const activeBookings = bookings.filter((b: any) => b.status === "confirmed" || b.status === "checked-in").length;
  const pendingBookings = bookings.filter((b: any) => b.status === "pending").length;
  const monthlyRevenue = bookings
    .filter((b: any) => b.status !== "cancelled" && b.created_at?.startsWith(today.slice(0, 7)))
    .reduce((s: number, b: any) => s + (b.amount || 0), 0);
  const occupancy = totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonth = months.map((m, i) => {
    const mStr = String(i + 1).padStart(2, "0");
    const rev = bookings
      .filter((b: any) => b.status !== "cancelled" && b.created_at?.slice(5, 7) === mStr)
      .reduce((s: number, b: any) => s + (b.amount || 0), 0);
    return { month: m, revenue: rev };
  });

  const upcoming = bookings.filter((b: any) => b.check_in >= today && b.status !== "cancelled").slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">Today&apos;s overview for Houseboat Canberra</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KPICard icon={<CalendarCheck className="h-4 w-4" />} label="Today Check-ins" value={String(todayCheckins)} />
        <KPICard icon={<CalendarX className="h-4 w-4" />} label="Today Check-outs" value={String(todayCheckouts)} />
        <KPICard icon={<Activity className="h-4 w-4" />} label="Occupancy" value={`${occupancy}%`} />
        <KPICard icon={<BedDouble className="h-4 w-4" />} label="Available Rooms" value={String(totalRooms - activeBookings)} />
        <KPICard icon={<Building2 className="h-4 w-4" />} label="Active Bookings" value={String(activeBookings)} trend="up" trendLabel="+2 this week" />
        <KPICard icon={<Sparkles className="h-4 w-4" />} label="Pending" value={String(pendingBookings)} />
        <KPICard icon={<IndianRupee className="h-4 w-4" />} label="Monthly Revenue" value={`₹${monthlyRevenue.toLocaleString()}`} />
        <KPICard icon={<TrendingUp className="h-4 w-4" />} label="ADR" value={`₹${activeBookings > 0 ? Math.round(monthlyRevenue / activeBookings).toLocaleString() : "0"}`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-light mb-6" style={{ fontFamily: "var(--font-display)" }}>Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#C8A86B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-light mb-6" style={{ fontFamily: "var(--font-display)" }}>Upcoming Arrivals</h2>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming arrivals" />
          ) : (
            <div className="space-y-3">
              {upcoming.map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{b.guest_name}</div>
                    <div className="text-[11px] text-white/40">{b.room_name} • {b.check_in} → {b.check_out} • {b.adults}A {b.children > 0 ? `${b.children}C` : ""}</div>
                  </div>
                  <div className="text-right">
                    <Badge status={b.status} />
                    <div className="mt-1 text-[11px] text-white/50">₹{b.amount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
