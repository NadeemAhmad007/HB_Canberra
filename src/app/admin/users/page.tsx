"use client";

import { useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Dialogs";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const ROLE_COLORS: Record<string, string> = { owner: "bg-amber-500/20 text-amber-300", reception: "bg-blue-500/20 text-blue-300", housekeeping: "bg-emerald-500/20 text-emerald-300", accountant: "bg-purple-500/20 text-purple-300" };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "reception" });
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=users", { headers: h() }).then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const saveUser = async () => {
    if (selected) {
      await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "user", data: { id: selected.id, name: form.name, email: form.email, role: form.role } }) });
      toast({ title: "User updated", type: "success" });
    } else {
      if (!form.password) { toast({ title: "Password required", type: "warning" }); return; }
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(form.password, 10);
      await fetch("/api/admin", { method: "POST", headers: h(), body: JSON.stringify({ resource: "user", data: { name: form.name, email: form.email, password_hash: hash, role: form.role } }) });
      toast({ title: "User created", type: "success" });
    }
    setShowCreate(false); setSelected(null); setForm({ name: "", email: "", password: "", role: "reception" });
    fetchData();
  };

  const columns: Column<any>[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (r) => <span className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider ${ROLE_COLORS[r.role] || ""}`}>{r.role}</span> },
    { key: "created_at", label: "Created", render: (r) => <span className="text-xs text-white/50">{r.created_at?.slice(0, 10)}</span> },
  ];

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Users</h1><p className="mt-1 text-sm text-white/50">Manage staff accounts & roles</p></div>
        <button onClick={() => setShowCreate(true)} className="rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black">+ Add User</button>
      </div>

      {users.length === 0 ? <EmptyState title="No users yet" /> : (
        <DataTable columns={columns} data={users} loading={false} onRowClick={(r) => { setSelected(r); setForm({ name: r.name, email: r.email, password: "", role: r.role }); setShowCreate(true); }} />
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setSelected(null); }} title={selected ? "Edit User" : "New User"}>
        <div className="space-y-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
          {!selected && <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none">
            <option value="reception" className="bg-black">Reception</option>
            <option value="housekeeping" className="bg-black">Housekeeping</option>
            <option value="accountant" className="bg-black">Accountant</option>
            <option value="owner" className="bg-black">Owner</option>
          </select>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowCreate(false); setSelected(null); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] uppercase tracking-wider text-white/60">Cancel</button>
            <button onClick={saveUser} className="flex-1 rounded-xl bg-white py-2.5 text-[11px] uppercase tracking-wider text-black">{selected ? "Save" : "Create"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
