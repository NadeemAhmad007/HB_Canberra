"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

const PASSWORD_KEY = "admin_token";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY);
    const userJson = sessionStorage.getItem("admin_user");
    if (saved) {
      setToken(saved);
      if (userJson) {
        try { setUser(JSON.parse(userJson)); } catch { setUser({ name: "Admin", role: "owner" }); }
      } else {
        setUser({ name: "Admin", role: "owner" });
      }
    } else if (pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    setChecked(true);
  }, [router, pathname]);

  if (!checked) return null;
  if (!token && pathname !== "/admin/login") return null;

  const handleLogout = () => {
    setToken("");
    setUser(null);
    sessionStorage.removeItem(PASSWORD_KEY);
    sessionStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  return (
    <ToastProvider>
      <meta name="robots" content="noindex,nofollow" />
      {token ? (
        <AdminShell token={token} user={user} onLogout={handleLogout}>
          {children}
        </AdminShell>
      ) : (
        children
      )}
    </ToastProvider>
  );
}
