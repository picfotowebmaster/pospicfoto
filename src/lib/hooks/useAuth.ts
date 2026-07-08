"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const hasSupabase = supabase != null;
  const [cargando, setCargando] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) return;

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

  useEffect(() => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }: { data: unknown }) => setProfile(data as Profile | null))
      .catch(() => setProfile(null));
  }, [session?.user.id]);

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

  return { session, profile, cargando, signIn, signOut, resetPasswordForEmail };
}
