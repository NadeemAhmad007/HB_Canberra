"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, BookOpen, DoorOpen, DollarSign, Palmtree, Store, Users, BarChart3, Bell, Settings, ChevronLeft, Search, LogOut, Hotel, UserCheck, Sparkles, FileText, Activity, Mail, Shield } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
  { href: "/admin/checkin", icon: UserCheck, label: "Check-in/Out" },
  { href: "/admin/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/admin/rooms", icon: DoorOpen, label: "Rooms" },
  { href: "/admin/housekeeping", icon: Sparkles, label: "Housekeeping" },
  { href: "/admin/rates", icon: DollarSign, label: "Rates" },
  { href: "/admin/seasons", icon: Palmtree, label: "Seasons" },
  { href: "/admin/inventory", icon: Store, label: "Inventory" },
  { href: "/admin/guests", icon: Users, label: "Guests" },
  { href: "/admin/invoices", icon: FileText, label: "Invoices" },
  { href: "/admin/reports", icon: BarChart3, label: "Reports" },
  { href: "/admin/users", icon: Shield, label: "Users" },
  { href: "/admin/activity", icon: Activity, label: "Activity" },
  { href: "/admin/email-templates", icon: Mail, label: "Emails" },
  { href: "/admin/notifications", icon: Bell, label: "Notify" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminShell({ children, token, onLogout }: { children: ReactNode; token: string; onLogout: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const shortBreadcrumb = navItems.find((n) => n.href === pathname)?.label || "Dashboard";

  return (
    <div className="flex h-screen bg-[#0A0D0C] text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={clsx(
          "flex flex-col border-r border-white/10 bg-[#0F1214] transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className={clsx("flex items-center border-b border-white/10 px-4", collapsed ? "h-16 justify-center" : "h-16")}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <Hotel className="h-5 w-5 text-[#C8A86B] shrink-0" />
              <span className="text-xs uppercase tracking-wider text-white/80 truncate" style={{ fontFamily: "var(--font-display)" }}>Canberra PMS</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx("text-white/30 hover:text-white transition", collapsed ? "" : "ml-auto")}
          >
            <ChevronLeft className={clsx("h-4 w-4 transition", collapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] uppercase tracking-wider transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/[0.04]",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button onClick={onLogout} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/[0.04] transition w-full", collapsed && "justify-center")}>
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0A0D0C] px-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-wider text-white/30">Admin / <span className="text-white/70">{shortBreadcrumb}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(!searchOpen)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5">
              <Search className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-[10px]">
              ⌘K
            </button>
          </div>
        </header>

        {/* Global search bar */}
        {searchOpen && (
          <div className="border-b border-white/10 bg-[#0F1214] px-6 py-4">
            <div className="relative mx-auto max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                autoFocus
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search bookings, guests, rooms..."
                className="w-full rounded-xl border border-white/10 bg-black/50 py-3 pl-12 pr-4 text-sm outline-none focus:border-white/30"
                onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
              />
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
