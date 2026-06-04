"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

export default function ReportsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=bookings", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
    ]).then(([b, r]) => { setBookings(b); setRooms(r); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const revenueByMonth = months.map((m, i) => {
    const mStr = String(i + 1).padStart(2, "0");
    const rev = safeBookings.filter((b: any) => b.status !== "cancelled" && b.created_at?.slice(5,7) === mStr)
      .reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const cnt = safeBookings.filter((b: any) => b.status !== "cancelled" && b.created_at?.slice(5,7) === mStr).length;
    return { month: m, revenue: rev, bookings: cnt };
  });

  const totalRevenue = revenueByMonth.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = revenueByMonth.reduce((s, r) => s + r.bookings, 0);
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const totalRooms = safeRooms.reduce((s: number, r: any) => s + r.units, 0);
  const adr = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const revpar = totalRooms > 0 ? Math.round(totalRevenue / (totalRooms * 12)) : 0;

  const csvEscape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCSV = (type: string) => {
    let csv = "";
    if (type === "revenue") {
      const headers = ["Month", "Revenue (INR)", "Bookings"];
      csv = headers.join(",") + "\n" + revenueByMonth.map(r => `${csvEscape(r.month)},${r.revenue},${r.bookings}`).join("\n");
    } else {
      const headers = ["Reference", "Guest", "Email", "Phone", "Room", "Check-in", "Check-out", "Nights", "Units", "Adults", "Children", "Amount", "Currency", "Status", "Payment", "Created"];
      const rows = safeBookings.map((b: any) => [
        b.booking_ref, b.guest_name, b.email, b.phone, b.room_name, b.check_in, b.check_out,
        b.nights, b.units, b.adults, b.children, b.amount, b.currency, b.status, b.payment_status, b.created_at
      ].map(csvEscape).join(","));
      csv = headers.join(",") + "\n" + rows.join("\n");
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}-report.csv`;
    a.click();
    toast({ title: `${type} report exported`, type: "success" });
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Reports</h1><p className="mt-1 text-sm text-white/50">Year-to-date metrics</p></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Total Revenue</div>
          <div className="mt-2 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>₹{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Total Bookings</div>
          <div className="mt-2 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>{totalBookings}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-wider text-white/40">ADR</div>
          <div className="mt-2 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>₹{adr.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-wider text-white/40">RevPAR</div>
          <div className="mt-2 text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>₹{revpar.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-light" style={{ fontFamily: "var(--font-display)" }}>Revenue Trend</h2>
            <button onClick={() => exportCSV("revenue")} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white"><Download className="h-3 w-3" /> Export</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#C8A86B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-light" style={{ fontFamily: "var(--font-display)" }}>Booking Volume</h2>
            <button onClick={() => exportCSV("bookings")} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white"><FileSpreadsheet className="h-3 w-3" /> Export</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="bookings" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
