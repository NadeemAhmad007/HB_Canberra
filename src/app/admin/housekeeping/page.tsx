"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { Sparkles, Search, CheckCircle2, Clock, Wrench } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const TYPE_ICONS: Record<string, any> = { clean: Sparkles, inspect: Search, maintenance: Wrench, deep_clean: Sparkles };
const STATUS_COLORS: Record<string, string> = { pending: "bg-amber-500/20 text-amber-300", in_progress: "bg-blue-500/20 text-blue-300", completed: "bg-emerald-500/20 text-emerald-300", cancelled: "bg-white/10 text-white/40" };

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ room_id: 0, task_type: "clean", assigned_to: "", notes: "" });
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin?resource=housekeeping&date=${date}`, { headers: h() }).then(r => r.json()),
      fetch("/api/admin?resource=rooms", { headers: h() }).then(r => r.json()),
    ]).then(([t, r]) => { setTasks(Array.isArray(t) ? t : []); setRooms(Array.isArray(r) ? r : []); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [date]);

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "housekeeping", data: { id, status } }) });
    toast({ title: "Task updated", type: "success" });
    fetchData();
  };

  const createTask = async () => {
    if (!newTask.room_id) return;
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "housekeeping", data: { ...newTask, scheduled_date: date } }) });
    setShowCreate(false);
    setNewTask({ room_id: 0, task_type: "clean", assigned_to: "", notes: "" });
    toast({ title: "Task created", type: "success" });
    fetchData();
  };

  const roomStatusMap: Record<number, string> = {};
  tasks.forEach((t: any) => {
    if (t.status !== "completed") roomStatusMap[t.room_id] = t.status;
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Housekeeping</h1><p className="mt-1 text-sm text-white/50">Room cleanliness & maintenance tracking</p></div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm outline-none" />
          <button onClick={() => setShowCreate(true)} className="rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black">+ New Task</button>
        </div>
      </div>

      {/* Room status overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rooms.map((r: any) => {
          const st = roomStatusMap[r.id] || "clean";
          const stColor = st === "clean" || !roomStatusMap[r.id] ? "border-emerald-500/20 bg-emerald-500/[0.03]" : st === "in_progress" ? "border-blue-500/20 bg-blue-500/[0.03]" : "border-amber-500/20 bg-amber-500/[0.03]";
          return (
            <div key={r.id} className={`rounded-2xl border ${stColor} p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-light">{r.name}</span>
                <span className={`text-[9px] uppercase tracking-wider ${st === "clean" || !roomStatusMap[r.id] ? "text-emerald-400" : st === "in_progress" ? "text-blue-400" : "text-amber-400"}`}>
                  {st === "clean" || !roomStatusMap[r.id] ? "Clean" : st === "in_progress" ? "In Progress" : "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tasks list */}
      <h2 className="text-lg font-light pt-4" style={{ fontFamily: "var(--font-display)" }}>Tasks</h2>
      {tasks.length === 0 ? <EmptyState title="No tasks for this date" /> : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-normal">Room</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Assigned to</th>
              <th className="px-4 py-3 font-normal">Notes</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal"></th>
            </tr></thead>
            <tbody>
              {tasks.map((t: any) => {
                const Icon = TYPE_ICONS[t.task_type] || Sparkles;
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                    <td className="px-4 py-3 text-white/80">{t.room_name}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2 text-white/60"><Icon className="h-3.5 w-3.5" />{t.task_type.replace("_", " ")}</div></td>
                    <td className="px-4 py-3 text-white/50 text-xs">{t.assigned_to || "—"}</td>
                    <td className="px-4 py-3 text-white/40 text-xs max-w-[200px] truncate">{t.notes || "—"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider ${STATUS_COLORS[t.status] || "bg-white/10 text-white/50"}`}>{t.status}</span></td>
                    <td className="px-4 py-3">
                      <select value="" onChange={(e) => { if (e.target.value) updateStatus(t.id, e.target.value); }} className="rounded-lg border border-white/10 bg-black px-2 py-1 text-[10px] uppercase tracking-wider text-white/70 outline-none">
                        <option value="">Update</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancel</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0D0C] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>New Task</h3>
            <div className="mt-4 space-y-4">
              <select value={newTask.room_id} onChange={(e) => setNewTask({ ...newTask, room_id: parseInt(e.target.value) })} className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none">
                <option value={0} className="bg-black">Select room</option>
                {rooms.map((r: any) => <option key={r.id} value={r.id} className="bg-black">{r.name}</option>)}
              </select>
              <select value={newTask.task_type} onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none">
                <option value="clean" className="bg-black">Clean</option>
                <option value="deep_clean" className="bg-black">Deep Clean</option>
                <option value="inspect" className="bg-black">Inspect</option>
                <option value="maintenance" className="bg-black">Maintenance</option>
              </select>
              <input value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })} placeholder="Assigned to" className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none" />
              <textarea value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} rows={2} placeholder="Notes..." className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm outline-none resize-none" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] uppercase tracking-wider text-white/60">Cancel</button>
                <button onClick={createTask} className="flex-1 rounded-xl bg-white py-2.5 text-[11px] uppercase tracking-wider text-black">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
