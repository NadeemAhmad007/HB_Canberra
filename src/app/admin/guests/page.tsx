"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/Dialogs";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/Badge";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface Guest {
  id: number; name: string; email: string; phone: string; address: string; nationality: string;
  notes: string; vip: boolean; total_stays: number; total_spend: number; last_stay: string | null;
}

export default function GuestsPage() {
  const [data, setData] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Guest | null>(null);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=guests", { headers: h() })
      .then((r) => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const save = async (g: Guest) => {
    const res = await fetch("/api/admin/guests", {
      method: "PUT", headers: h(), body: JSON.stringify(g),
    });
    if (res.ok) toast({ title: "Guest saved", type: "success" });
    else toast({ title: "Error saving guest", type: "error" });
    fetchData();
    setEdit(null);
  };

  const columns: Column<Guest>[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "nationality", label: "Nationality" },
    { key: "total_stays", label: "Stays" },
    {
      key: "total_spend", label: "Total Spend", render: (r) => `₹${r.total_spend?.toLocaleString() || 0}`,
    },
    {
      key: "vip", label: "", render: (r) => r.vip ? <Badge status="confirmed" label="VIP" /> : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Guests</h1><p className="mt-1 text-sm text-white/50">{data.length} guest profiles</p></div>
      <DataTable columns={columns} data={data} loading={loading} onRowClick={setEdit} emptyTitle="No guest profiles" exportFilename="guests.csv" />

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? edit.name : "Guest"} wide>
        {edit && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Name</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Email</label><input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Phone</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Nationality</label><input value={edit.nationality} onChange={(e) => setEdit({ ...edit, nationality: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Address</label><input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={edit.vip} onChange={(e) => setEdit({ ...edit, vip: e.target.checked })} className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">VIP Guest</span>
                </label>
              </div>
            </div>
            <div><label className="text-[10px] uppercase tracking-wider text-white/40">Notes</label><textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none h-20" /></div>
            <button onClick={() => save(edit)} className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90">Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
