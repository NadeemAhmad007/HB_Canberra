"use client";

import { useState, useEffect } from "react";
import { DoorOpen, Users, IndianRupee, BedDouble, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { Modal } from "@/components/admin/Dialogs";
import { useToast } from "@/components/admin/Toast";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

interface Room { id: number; name: string; units: number; base_price: number; max_adults: number; max_children: number; child_policy: string; active: boolean; status: string; }

export default function RoomsPage() {
  const [data, setData] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Room | null>(null);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=rooms", { headers: h() })
      .then((r) => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const save = async (r: Room) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "rooms", data: [r] }) });
    toast({ title: "Room saved", type: "success" });
    fetchData();
    setEdit(null);
  };

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (!data.length) return <EmptyState title="No rooms" description="Create a room to get started." />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Rooms</h1><p className="mt-1 text-sm text-white/50">{data.length} room types</p></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((r) => (
          <div key={r.id} className={`group rounded-2xl border ${r.active ? "border-white/10 hover:border-white/20" : "border-white/5 opacity-60"} bg-white/[0.02] p-6 transition cursor-pointer`} onClick={() => setEdit({ ...r })}>
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C8A86B]/10 text-[#C8A86B]">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${r.active ? "bg-emerald-500/10 text-emerald-300" : "bg-gray-500/10 text-gray-400"}`}>
                {r.active ? "Active" : "Inactive"}
              </div>
            </div>
            <h3 className="mt-5 text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{r.name}</h3>
            <div className="mt-4 space-y-2 text-sm text-white/60">
              <div className="flex items-center gap-2"><BedDouble className="h-3.5 w-3.5" /> {r.units} unit{r.units > 1 ? "s" : ""}</div>
              <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Up to {r.max_adults}A + {r.max_children}C</div>
              <div className="flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" /> ₹{r.base_price?.toLocaleString()}/night</div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit ${edit.name}` : "Edit Room"}>
        {edit && (
          <div className="space-y-5 text-sm" onSubmit={(e) => { e.preventDefault(); save(edit); }}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Name</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Units</label><input type="number" value={edit.units} onChange={(e) => setEdit({ ...edit, units: parseInt(e.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Base Price (₹)</label><input type="number" value={edit.base_price} onChange={(e) => setEdit({ ...edit, base_price: parseInt(e.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Max Adults</label><input type="number" value={edit.max_adults} onChange={(e) => setEdit({ ...edit, max_adults: parseInt(e.target.value) || 1 })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Max Children</label><input type="number" value={edit.max_children} onChange={(e) => setEdit({ ...edit, max_children: parseInt(e.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none" /></div>
              <div><label className="text-[10px] uppercase tracking-wider text-white/40">Status</label>
                <select value={edit.active ? "active" : "inactive"} onChange={(e) => setEdit({ ...edit, active: e.target.value === "active" })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div><label className="text-[10px] uppercase tracking-wider text-white/40">Child Policy</label><textarea value={edit.child_policy} onChange={(e) => setEdit({ ...edit, child_policy: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 outline-none text-sm h-20" /></div>
            <button onClick={() => save(edit)} className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-wider text-black hover:bg-white/90">Save Changes</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
