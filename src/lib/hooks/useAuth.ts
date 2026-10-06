"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profileRecord, setProfileRecord] = useState<{
    userId: string;
    profile: Profile | null;
  } | null>(null);
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
  }, [hasSupabase]);

  useEffect(() => {
    if (!session?.user.id) return;
    const userId = session.user.id;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }: { data: unknown }) =>
        setProfileRecord({ userId, profile: data as Profile | null }),
      )
      .catch(() => setProfileRecord({ userId, profile: null }));
  }, [session?.user.id]);

  const profile =
    profileRecord && profileRecord.userId === session?.user.id
      ? profileRecord.profile
      : null;

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
