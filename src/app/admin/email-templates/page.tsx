"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { EmptyState } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { Save, Eye, EyeOff } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const EVENTS = [
  { value: "booking_confirmed", label: "Booking Confirmed" },
  { value: "checkin_reminder", label: "Check-in Reminder" },
  { value: "post_stay", label: "Post-Stay Follow-up" },
];

const VARIABLES = ["{{guest_name}}", "{{booking_ref}}", "{{check_in}}", "{{check_out}}", "{{room_name}}", "{{amount}}"];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const { toast } = useToast();

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin?resource=email-templates", { headers: h() }).then(r => r.json())
      .then(d => { setTemplates(Array.isArray(d) ? d : []); if (Array.isArray(d) && d[0]) selectTemplate(d[0]); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const selectTemplate = (t: any) => {
    setSelectedId(t.id); setSubject(t.subject); setBody(t.body); setPreview(false);
  };

  const save = async () => {
    if (!selectedId) return;
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "email-template", data: { id: selectedId, subject, body } }) });
    toast({ title: "Template saved", type: "success" });
    fetchData();
  };

  const toggleActive = async (t: any) => {
    await fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "email-template", data: { id: t.id, active: !t.active } }) });
    fetchData();
  };

  const insertVar = (v: string) => {
    setBody((prev) => prev + v);
  };

  const previewBody = body
    .replace(/\{\{guest_name\}\}/g, "John Doe")
    .replace(/\{\{booking_ref\}\}/g, "HBC-20260604-123")
    .replace(/\{\{check_in\}\}/g, "2026-06-10")
    .replace(/\{\{check_out\}\}/g, "2026-06-14")
    .replace(/\{\{room_name\}\}/g, "Deluxe Room")
    .replace(/\{\{amount\}\}/g, "₹46,000");

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!templates.length) return <EmptyState title="No email templates found" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Email Templates</h1><p className="mt-1 text-sm text-white/50">Automated emails sent to guests</p></div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-1">
          {templates.map((t: any) => (
            <button key={t.id} onClick={() => selectTemplate(t)} className={`w-full text-left rounded-xl px-4 py-3 text-sm transition ${selectedId === t.id ? "bg-white/10 border border-white/20" : "hover:bg-white/[0.03] border border-transparent"}`}>
              <div className="flex items-center justify-between">
                <span className="text-white/80">{EVENTS.find(e => e.value === t.trigger_event)?.label || t.trigger_event}</span>
                <span className={`h-2 w-2 rounded-full ${t.active ? "bg-emerald-400" : "bg-white/20"}`} />
              </div>
              <div className="text-[10px] text-white/40 mt-1 truncate">{t.subject}</div>
            </button>
          ))}
        </div>

        {selectedId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setPreview(!preview)} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[11px] uppercase tracking-wider text-white/60 hover:bg-white/5">
                  {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {preview ? "Edit" : "Preview"}
                </button>
                <button onClick={() => toggleActive(templates.find(t => t.id === selectedId)!)} className="rounded-xl border border-white/10 px-4 py-2 text-[11px] uppercase tracking-wider text-white/60 hover:bg-white/5">Toggle Active</button>
              </div>
              <button onClick={save} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black"><Save className="h-3.5 w-3.5" /> Save</button>
            </div>

            {!preview ? (
              <>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-white/30" placeholder="Subject line" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-white/30 resize-none font-mono" />
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map((v) => (
                    <button key={v} onClick={() => insertVar(v)} className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-mono text-white/50 hover:bg-white/5">{v}</button>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm">
                <div className="font-medium">Subject: {subject}</div>
                <hr className="my-4 border-white/10" />
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{previewBody}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
