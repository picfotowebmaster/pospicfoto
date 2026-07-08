"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { session, cargando: cargandoSesion, signIn, resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [esRecuperacion, setEsRecuperacion] = useState(false);

  // Redirigir automáticamente si ya hay sesión activa
  useEffect(() => {
    if (session?.user?.id) {
      router.push("/mostrador");
    }
  }, [session, router]);

  // Mostrar loader mientras se verifica la sesión inicial
  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">PIC PHOTO</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function handleRecuperarPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);
    try {
      const { error: err } = await resetPasswordForEmail(email);
      if (err) {
        setError("Error al enviar el correo de recuperación. Verifica el email.");
      } else {
        setMensaje("Revisa tu correo. Te hemos enviado un enlace para restablecer tu contraseña.");
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">PIC PHOTO</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Punto de Venta</p>
        </div>

        {esRecuperacion ? (
          <form onSubmit={handleRecuperarPassword} className="space-y-4">
            <p className="text-sm text-gray-600">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="bg-green-50 text-green-600 text-sm px-3 py-2 rounded-lg">
                {mensaje}
              </div>
            )}

            <div>
              <label htmlFor="email-recovery" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email-recovery"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="cajero@picphoto.com"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar enlace"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setEsRecuperacion(false);
                setError("");
                setMensaje("");
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800"
            >
              Volver al inicio de sesión
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="cajero@picphoto.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={cargando}>
              {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setEsRecuperacion(true);
                setError("");
                setMensaje("");
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
