export const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  confirmed: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "checked-in": "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "checked-out": "bg-gray-500/15 text-gray-300 border-gray-500/25",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

export const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  refunded: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  partial_refund: "bg-purple-500/10 text-purple-300/80 border-purple-500/20",
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const c = statusColors[status] || "bg-white/10 text-white/60 border-white/10";
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider font-medium ${c}`}>
      {label || status}
    </span>
  );
}
