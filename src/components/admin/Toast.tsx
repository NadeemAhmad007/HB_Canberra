"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const colors: Record<string, string> = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    info: "border-blue-500/40 bg-blue-500/10 text-blue-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in slide-in-from-right rounded-xl border px-5 py-4 text-sm shadow-2xl backdrop-blur-xl ${colors[t.type] || colors.info}`}
          >
            <div className="flex items-center justify-between gap-4">
              <strong className="text-xs uppercase tracking-wider">{t.title}</strong>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 text-xs">✕</button>
            </div>
            {t.message && <p className="mt-1 text-xs opacity-80">{t.message}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
