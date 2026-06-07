"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCargando(false);
      return;
    }

    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      setSession(result.data.session);
      setCargando(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Cliente de Supabase no inicializado.") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) {
      setSession(null);
      router.push("/auth/login");
      return;
    }
    // Limpiar estado local primero
    setSession(null);
    // Luego hacer logout en Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error en logout:", error);
    }
    // Finalmente redirigir
    router.push("/auth/login");
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!supabase) return { error: new Error("Cliente de Supabase no inicializado.") };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  return { session, cargando, signIn, signOut, resetPasswordForEmail };
}
