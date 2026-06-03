"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, Info, AlertTriangle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/Badge";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const iconMap: Record<string, any> = { info: Info, warning: AlertTriangle, error: XCircle, success: CheckCheck };

export default function NotificationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=notifications", { headers: h() })
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const markRead = async (id: number) => {
    await fetch("/api/admin/notifications", { method: "PUT", headers: h(), body: JSON.stringify({ id }) });
    fetchData();
  };

  const filtered = filter === "all" ? data : data.filter((n) => n.type === filter);
  const unread = data.filter((n) => !n.read).length;

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Notifications</h1>
          <p className="mt-1 text-sm text-white/50">{unread} unread</p>
        </div>
        <div className="flex gap-2">
          {["all", "info", "success", "warning", "error"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-[10px] uppercase tracking-wider ${filter === f ? "bg-white/15 text-white" : "border border-white/10 text-white/40 hover:text-white"}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {!filtered.length ? <EmptyState title="No notifications" description="You're all caught up." icon="🔔" /> : (
        <div className="space-y-2">
          {filtered.map((n: any) => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-4 rounded-2xl border px-6 py-5 transition ${n.read ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.03]"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  n.type === "error" ? "bg-rose-500/10 text-rose-300" : n.type === "warning" ? "bg-amber-500/10 text-amber-300" : n.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-[#C8A86B]" />}
                  </div>
                  <p className="mt-1 text-sm text-white/50">{n.message}</p>
                  <p className="mt-1 text-[10px] text-white/30">{n.created_at?.slice(0, 16)}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white whitespace-nowrap">Mark read</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
