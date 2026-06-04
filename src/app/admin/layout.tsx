"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

const PASSWORD_KEY = "admin_token";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY);
    if (saved) {
      setToken(saved);
    } else if (pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    setChecked(true);
  }, [router, pathname]);

  if (!checked) return null;
  if (!token && pathname !== "/admin/login") return null;

  const handleLogout = () => {
    setToken("");
    sessionStorage.removeItem(PASSWORD_KEY);
    sessionStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  return (
    <ToastProvider>
      {token ? (
        <AdminShell token={token} onLogout={handleLogout}>
          {children}
        </AdminShell>
      ) : (
        children
      )}
    </ToastProvider>
  );
}
