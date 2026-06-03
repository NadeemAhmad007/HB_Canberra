"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

export default function RatesPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=rooms", { headers: h() }).then((r) => r.json()),
      fetch("/api/admin?resource=seasons", { headers: h() }).then((r) => r.json()),
    ]).then(([r, s]) => {
      setRooms(r); setSeasons(s);
      const map: Record<number, number> = {};
      r.forEach((rm: any) => { map[rm.id] = rm.base_price; });
      setEditing(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const updates = rooms.map((r: any) => ({ ...r, base_price: editing[r.id] || r.base_price }));
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "rooms", data: updates }) });
    toast({ title: "Rates updated", type: "success" });
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!rooms.length) return <EmptyState title="No rooms" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Rate Management</h1><p className="mt-1 text-sm text-white/50">Click to edit rates. Seasonal multipliers are applied automatically.</p></div>
        <button onClick={save} className="rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black">Save All</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider text-white/40 font-normal">Room</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider text-white/40 font-normal">Base Rate</th>
              {seasons.map((s: any, i: number) => (
                <th key={i} className="px-6 py-4 text-[10px] uppercase tracking-wider text-white/40 font-normal">{s.start_date} — {s.end_date}<div className="text-[9px] text-white/20">{s.multiplier}×</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r: any) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-6 py-4 text-white/80">{r.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={editing[r.id] || r.base_price}
                    onChange={(e) => setEditing({ ...editing, [r.id]: parseInt(e.target.value) || 0 })}
                    className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-white/30"
                  />
                </td>
                {seasons.map((s: any, i: number) => (
                  <td key={i} className="px-6 py-4 text-[#C8A86B]">₹{Math.round((editing[r.id] || r.base_price) * s.multiplier).toLocaleString()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
