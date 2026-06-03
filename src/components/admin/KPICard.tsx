"use client";

import { type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function KPICard({ icon, label, value, trend, trendLabel, sub }: {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: "up" | "down";
  trendLabel?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-white/40">{sub}</div>}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px]">
          {trend === "up" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
          <span className={trend === "up" ? "text-emerald-400" : "text-rose-400"}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
