"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { useToast } from "@/components/admin/Toast";
import { Save, Clock, IndianRupee, MapPin, Phone, Mail, Percent, CreditCard, Shield } from "lucide-react";

const token = () => sessionStorage.getItem("admin_token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const GENERAL_FIELDS = [
  { key: "hotel_name", label: "Hotel Name", icon: MapPin },
  { key: "hotel_address", label: "Address", icon: MapPin },
  { key: "hotel_email", label: "Email", icon: Mail },
  { key: "hotel_phone", label: "Phone", icon: Phone },
  { key: "tax_rate", label: "Tax Rate (%)", icon: Percent, type: "number" },
  { key: "currency", label: "Currency", icon: IndianRupee },
  { key: "checkin_time", label: "Check-in Time", icon: Clock },
  { key: "checkout_time", label: "Check-out Time", icon: Clock },
  { key: "default_nights", label: "Default Nights", icon: Clock, type: "number" },
  { key: "timezone", label: "Timezone", icon: Clock },
];

const PAYMENT_FIELDS = [
  { key: "bank_name", label: "Bank Name", icon: CreditCard },
  { key: "bank_account_name", label: "Account Name", icon: CreditCard },
  { key: "bank_account_number", label: "Account Number", icon: CreditCard },
  { key: "bank_ifsc", label: "IFSC Code", icon: CreditCard },
  { key: "bank_upi_id", label: "UPI ID (optional)", icon: CreditCard },
];

export default function SettingsPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?resource=property", { headers: h() }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin?resource=settings", { headers: h() }).then((r) => r.json()).catch(() => ({})),
    ]).then(([p, s]) => setData({ ...p, ...s })).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const propertyData: Record<string, string> = {};
    const settingsData: Record<string, string> = {};
    const paymentKeys = PAYMENT_FIELDS.map((f) => f.key);
    [...GENERAL_FIELDS, ...PAYMENT_FIELDS].forEach((f) => {
      if (["hotel_name", "hotel_address", "hotel_email", "hotel_phone", "tax_rate", "currency"].includes(f.key)) {
        propertyData[f.key.toUpperCase()] = data[f.key] || "";
      } else {
        settingsData[f.key] = data[f.key] || "";
      }
    });

    await Promise.all([
      fetch("/api/admin", { method: "PUT", headers: h(), body: JSON.stringify({ resource: "property", data: propertyData }) }),
      fetch("/api/admin/settings", { method: "PUT", headers: h(), body: JSON.stringify(settingsData) }),
    ]);
    toast({ title: "Settings saved", type: "success" });
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const renderFields = (fields: typeof GENERAL_FIELDS) => fields.map((f) => {
    const Icon = f.icon;
    return (
      <div key={f.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/40">{f.label}</span>
        </div>
        <input
          type={(f as any).secret ? "password" : (f as any).type || "text"}
          value={data[f.key] || ""}
          onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-white/30"
        />
      </div>
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Settings</h1><p className="mt-1 text-sm text-white/50">Manage your property configuration and payment gateways</p></div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[11px] uppercase tracking-wider text-black disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save All"}</button>
      </div>

      <div>
        <h2 className="text-lg font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>General</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderFields(GENERAL_FIELDS)}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h2 className="text-lg font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>
          <CreditCard className="h-4 w-4 inline mr-2 text-[#C8A86B]" />
          Bank Transfer Details
        </h2>
        <p className="text-sm text-white/50 mb-6">Bank account shown to guests after booking. Update these if your account details change.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderFields(PAYMENT_FIELDS)}
        </div>
      </div>
    </div>
  );
}
