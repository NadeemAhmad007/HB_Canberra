"use client";

import { useState, useMemo, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Download } from "lucide-react";
import { SkeletonRows } from "./Skeleton";
import { EmptyState } from "./Skeleton";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable({
  columns,
  data,
  loading,
  sortable = true,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyTitle = "Nothing here",
  emptyDescription,
  onRowClick,
  exportFilename = "export.csv",
}: {
  columns: Column<any>[];
  data: any[];
  loading?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: any) => void;
  exportFilename?: string;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((row) =>
        columns.some((col) => {
          const v = row[col.key];
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return items;
  }, [data, search, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const exportCSV = () => {
    const headers = columns.map((c) => c.label).join(",");
    const rows = filtered.map((row) =>
      columns.map((col) => {
        const v = row[col.key];
        return v != null ? `"${String(v).replace(/"/g, '""')}"` : "";
      }).join(",")
    );
    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <SkeletonRows rows={6} cols={columns.length} />;
  if (!data.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div>
      {(searchable || exportFilename) && (
        <div className="mb-6 flex items-center justify-between gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-white/30"
              />
            </div>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[11px] uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`pb-4 pr-5 font-normal ${col.sortable !== false && sortable ? "cursor-pointer hover:text-white/70 select-none" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => { if (col.sortable !== false && sortable) toggleSort(col.key); }}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && sortable && (
                      sortKey === col.key
                        ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                        : <ChevronsUpDown className="h-3 w-3 text-white/20" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-white/5 text-white/80 transition ${onRowClick ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-4 pr-5 text-sm">
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-white/50">
          <span>{filtered.length} results</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-white/10 px-4 py-1.5 text-xs disabled:opacity-30 hover:bg-white/5">Prev</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`rounded-lg px-3 py-1.5 text-xs ${page === i ? "bg-white/15 text-white" : "border border-white/10 hover:bg-white/5"}`}>{i + 1}</button>
            ))}
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-lg border border-white/10 px-4 py-1.5 text-xs disabled:opacity-30 hover:bg-white/5">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
