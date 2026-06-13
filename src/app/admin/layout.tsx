"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSupabase } from "@/lib/supabase/client";
import RoleSwitcher from "./_components/RoleSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { Profile } from "@/lib/supabase/types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, signOut } = useAuth();
  const pathname = usePathname();
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const supabase = getSupabase();
    supabase
      .from("profiles")
      .select("rol")
      .eq("id", session.user.id)
      .single()
      .then(({ data }: { data: Pick<Profile, "rol"> | null }) => {
        if (data) setRol(data.rol);
      });
  }, [session?.user?.id]);

  const tabs = [
    { href: "/admin", label: "Catálogo" },
    { href: "/admin/pedidos", label: "Pedidos" },
    ...(rol === "superadmin"
      ? [{ href: "/admin/usuarios", label: "Usuarios" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">PIC PHOTO - Admin</h1>
          <p className="text-xs text-gray-500">Panel de administración</p>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <span className="text-sm text-gray-600">
            {session?.user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex gap-1 px-4">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                pathname === tab.href
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
