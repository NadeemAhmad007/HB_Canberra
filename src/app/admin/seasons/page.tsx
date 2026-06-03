"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/Dialogs";
import { useToast } from "@/components/admin/Toast";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface Season { start_date: string; end_date: string; multiplier: number; }

export default function SeasonsPage() {
  const [data, setData] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Season[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=seasons", { headers: h() })
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "seasons", data: editing }) });
    toast({ title: "Seasons saved", type: "success" });
    fetchData();
    setShowEditor(false);
  };

  const columns: Column<Season>[] = [
    { key: "start_date", label: "Start" },
    { key: "end_date", label: "End" },
    { key: "multiplier", label: "Multiplier", render: (r) => `${r.multiplier}×` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Seasons</h1><p className="mt-1 text-sm text-white/50">{data.length} seasons configured</p></div>
        <button onClick={() => { setEditing(data.map((s) => ({ ...s }))); setShowEditor(true); }} className="rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black">Manage</button>
      </div>
      <DataTable columns={columns} data={data} loading={loading} emptyTitle="No seasons" emptyDescription="Add seasons to configure seasonal pricing." />

      <Modal open={showEditor} onClose={() => setShowEditor(false)} title="Edit Seasons" wide>
        <div className="space-y-4">
          {editing.map((s, i) => (
            <div key={i} className="flex gap-3 items-end">
              <div className="flex-1"><label className="text-[10px] uppercase tracking-wider text-white/40">Start</label><input type="date" value={s.start_date} onChange={(e) => { const d = [...editing]; d[i] = { ...d[i], start_date: e.target.value }; setEditing(d); }} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none" /></div>
              <div className="flex-1"><label className="text-[10px] uppercase tracking-wider text-white/40">End</label><input type="date" value={s.end_date} onChange={(e) => { const d = [...editing]; d[i] = { ...d[i], end_date: e.target.value }; setEditing(d); }} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none" /></div>
              <div className="w-24"><label className="text-[10px] uppercase tracking-wider text-white/40">×</label><input type="number" step="0.1" value={s.multiplier} onChange={(e) => { const d = [...editing]; d[i] = { ...d[i], multiplier: parseFloat(e.target.value) || 1 }; setEditing(d); }} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none" /></div>
              <button onClick={() => setEditing(editing.filter((_, j) => j !== i))} className="text-rose-400 text-xs px-2 py-2.5">✕</button>
            </div>
          ))}
          <button onClick={() => setEditing([...editing, { start_date: "", end_date: "", multiplier: 1 }])} className="text-[11px] uppercase tracking-wider text-white/40 hover:text-white">+ Add season</button>
          <button onClick={save} className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90 mt-4">Save All</button>
        </div>
      </Modal>
    </div>
  );
}
