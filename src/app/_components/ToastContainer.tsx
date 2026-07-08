"use client";

import { ToastProvider } from "@/components/ui/Toast";

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
