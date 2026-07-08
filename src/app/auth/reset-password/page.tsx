"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sesionLista, setSesionLista] = useState(false);
  const [exito, setExito] = useState(false);
  const hasSupabase = supabase != null;
  const [verificando, setVerificando] = useState(hasSupabase);

  useEffect(() => {
    if (exito) {
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exito, router]);

  useEffect(() => {
    if (!hasSupabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setSesionLista(true);
          setVerificando(false);
        }
      }
    );

    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      if (result.data.session) {
        setSesionLista(true);
      }
      setVerificando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      if (!supabase) {
        setError("Cliente de Supabase no inicializado.");
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password });

      if (err) {
        setError(err.message);
      } else {
        setMensaje("Contraseña actualizada correctamente. Redirigiendo...");
        setPassword("");
        setConfirmar("");
        setExito(true);
        // Logout después del éxito
        try {
          await supabase.auth.signOut();
        } catch (logoutError) {
          console.error("Error en logout:", logoutError);
        }
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">PIC PHOTO</h1>
          <p className="text-sm text-gray-500">Verificando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  if (!sesionLista) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">PIC PHOTO</h1>
          <p className="text-sm text-red-600">
            El enlace de recuperación no es válido o ya expiró. Solicitá uno nuevo.
          </p>
          <a
            href="/auth/login"
            className="inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">PIC PHOTO</h1>
          <p className="text-sm text-gray-500 mt-1">Restablecer contraseña</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {mensaje ? (
            <>
              <div className="bg-green-50 text-green-600 text-sm px-3 py-2 rounded-lg">
                {mensaje}
              </div>
              <a
                href="/auth/login"
                className="block w-full text-center text-sm text-blue-600 hover:text-blue-800"
              >
                Ir al inicio de sesión
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Ingresa tu nueva contraseña.
              </p>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label htmlFor="confirmar" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmar"
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repite tu contraseña"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={cargando}>
                {cargando ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
