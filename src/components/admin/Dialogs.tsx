"use client";

import { useState, useCallback, type ReactNode } from "react";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
        <p className="mt-3 text-sm text-white/60">{message}</p>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-white/20 px-6 py-2 text-[11px] uppercase tracking-wider text-white/70 hover:text-white">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-full px-6 py-2 text-[11px] uppercase tracking-wider text-white ${
              variant === "danger" ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "primary";
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const confirm = useCallback(
    (title: string, message: string, onConfirm: () => void, variant?: "danger" | "primary") => {
      setState({ open: true, title, message, onConfirm, variant });
    },
    []
  );

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onClose={() => setState((s) => ({ ...s, open: false }))}
      onConfirm={state.onConfirm}
      title={state.title}
      message={state.message}
      variant={state.variant}
    />
  );

  return { confirm, dialog };
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`mx-4 w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
          <h3 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
