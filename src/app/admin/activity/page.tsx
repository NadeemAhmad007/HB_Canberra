"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Search, Filter } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const ACTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  booking_created:        { icon: "📩", label: "Booking created",          color: "text-blue-300" },
  booking_status:         { icon: "🔄", label: "Status changed",           color: "text-amber-300" },
  checkin:                { icon: "✅", label: "Guest checked in",         color: "text-emerald-300" },
  checkout:               { icon: "🚪", label: "Guest checked out",        color: "text-white/60" },
  bulk_booking_status:    { icon: "📋", label: "Bulk status change",       color: "text-amber-300" },
  user_created:           { icon: "👤", label: "User created",             color: "text-blue-300" },
  invoice_created:        { icon: "🧾", label: "Invoice created",          color: "text-emerald-300" },
  bank_transfer_confirmed:{ icon: "🏦", label: "Bank transfer confirmed",  color: "text-emerald-300" },
  payment_recorded:       { icon: "💰", label: "Payment recorded",         color: "text-emerald-300" },
  id_proof_captured:      { icon: "🪪", label: "ID proof captured",        color: "text-white/70" },
};

function formatDateSafe(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

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
          {actions.map((a: string) => <option key={a} value={a}>{ACTION_LABELS[a]?.label || a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState title="No activity found" /> : (
        <div className="space-y-1">
          {filtered.map((l: any) => {
            const meta = ACTION_LABELS[l.action];
            return (
              <div key={l.id} className="flex items-start gap-4 rounded-xl border border-white/[0.03] px-4 py-3 hover:bg-white/[0.01]">
                <span className="text-lg">{meta?.icon || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-wider ${meta?.color || "text-white/40"}`}>{meta?.label || l.action}</span>
                  </div>
                  <div className="text-sm text-white/80 truncate">{l.description || "—"}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/30">
                    <span>{l.user_name}</span>
                    {l.entity_id && <span>{l.entity_type} #{l.entity_id}</span>}
                    <span>{formatDateSafe(l.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
