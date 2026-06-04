"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/admin/Badge";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { UserCheck, UserX, CalendarDays, Search } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

export default function CheckinPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"arrivals" | "in-house" | "departures">("arrivals");
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=bookings", { headers: h() })
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const arrivals = data.filter((b: any) => b.check_in === today && b.status === "pending" || b.status === "confirmed");
  const inHouse = data.filter((b: any) => b.status === "checked-in");
  const departures = data.filter((b: any) => b.check_out === today && b.status === "checked-in");

  const filtered = (view === "arrivals" ? arrivals : view === "in-house" ? inHouse : departures)
    .filter((b: any) => !search || b.guest_name?.toLowerCase().includes(search.toLowerCase()) || b.booking_ref?.toLowerCase().includes(search.toLowerCase()));

  const doCheckin = async (ref: string) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "checkin", data: { bookingRef: ref } }) });
    toast({ title: "Checked in", message: ref, type: "success" });
    fetchData();
  };

  const doCheckout = async (ref: string) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "checkout", data: { bookingRef: ref } }) });
    toast({ title: "Checked out", message: ref, type: "success" });
    fetchData();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Check-in / Check-out</h1><p className="mt-1 text-sm text-white/50">{today}</p></div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {([["arrivals", `Arrivals (${arrivals.length})`], ["in-house", `In House (${inHouse.length})`], ["departures", `Departures (${departures.length})`]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-[11px] uppercase tracking-wider ${view === v ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest or ref..." className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-white/30" />
      </div>

      {filtered.length === 0 ? <EmptyState title={view === "arrivals" ? "No arrivals today" : view === "in-house" ? "No guests in house" : "No departures today"} /> : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-normal">Guest</th>
              <th className="px-4 py-3 font-normal">Ref</th>
              <th className="px-4 py-3 font-normal">Room</th>
              <th className="px-4 py-3 font-normal">Check-in</th>
              <th className="px-4 py-3 font-normal">Check-out</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal"></th>
            </tr></thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.booking_ref} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                  <td className="px-4 py-3"><div className="text-white/90">{b.guest_name}</div><div className="text-[10px] text-white/40">{b.phone}</div></td>
                  <td className="px-4 py-3 text-[#C8A86B] font-mono text-xs">{b.booking_ref}</td>
                  <td className="px-4 py-3 text-white/70">{b.room_name} ×{b.units}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{b.check_in}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{b.check_out}</td>
                  <td className="px-4 py-3"><Badge status={b.status} /></td>
                  <td className="px-4 py-3">
                    {view === "arrivals" && (b.status === "confirmed" || b.status === "pending") && (
                      <button onClick={() => doCheckin(b.booking_ref)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/30"><UserCheck className="h-3 w-3" /> Check in</button>
                    )}
                    {view === "in-house" && (
                      <button onClick={() => doCheckout(b.booking_ref)} className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-amber-300 hover:bg-amber-500/30"><UserX className="h-3 w-3" /> Check out</button>
                    )}
                    {view === "departures" && (
                      <button onClick={() => doCheckout(b.booking_ref)} className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-amber-300 hover:bg-amber-500/30"><UserX className="h-3 w-3" /> Check out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
