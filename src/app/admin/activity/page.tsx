"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Search, Filter } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const ACTION_ICONS: Record<string, string> = {
  booking_created: "📩", booking_status: "🔄", checkin: "✅", checkout: "🚪",
  bulk_booking_status: "📋", user_created: "👤", invoice_created: "🧾",
};

export default function ActivityPage() {
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=activity", { headers: h() }).then(r => r.json())
      .then(d => setLog(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const actions = [...new Set(log.map((l: any) => l.action))];
  const filtered = log.filter((l: any) => {
    if (filterAction && l.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.description?.toLowerCase().includes(q) || l.entity_id?.toLowerCase().includes(q) || l.user_name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Activity Log</h1><p className="mt-1 text-sm text-white/50">Audit trail of all system actions</p></div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity..." className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-white/30" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none">
          <option value="">All actions</option>
          {actions.map((a: string) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState title="No activity found" /> : (
        <div className="space-y-1">
          {filtered.map((l: any) => (
            <div key={l.id} className="flex items-start gap-4 rounded-xl border border-white/[0.03] px-4 py-3 hover:bg-white/[0.01]">
              <span className="text-lg">{ACTION_ICONS[l.action] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 truncate">{l.description || l.action}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/30">
                  <span>{l.user_name}</span>
                  <span>{l.entity_type} #{l.entity_id}</span>
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
