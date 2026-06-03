export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-6">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl mb-5">
        {icon || "📭"}
      </div>
      <h3 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-white/50">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
