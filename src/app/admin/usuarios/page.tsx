"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { listarUsuarios, resetPassword, createUser, type UsuarioRow } from "./actions";

function ResetModal({
  usuario,
  onClose,
  onDone,
}: {
  usuario: UsuarioRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      await resetPassword(usuario.id, nuevaPassword);
      setExito(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cambiar la contraseña."
      );
    }
    setCargando(false);
  }

  if (exito) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 text-center">
          <div className="text-green-600 text-3xl">&#10003;</div>
          <h3 className="font-semibold text-gray-900">Contraseña actualizada</h3>
          <p className="text-sm text-gray-500">
            La contraseña de <strong>{usuario.email}</strong> fue cambiada exitosamente.
          </p>
          <Button onClick={onDone} className="w-full">
            Listo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-gray-900">Resetear contraseña</h3>
        <p className="text-sm text-gray-500">
          Usuario: <strong>{usuario.email}</strong>
        </p>

        <form onSubmit={handleReset} className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repite la contraseña"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="flex-1"
              disabled={cargando}
            >
              {cargando ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("mostrador");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      await createUser(email.trim(), password, nombre.trim(), rol);
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear el usuario."
      );
    }
    setCargando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-gray-900">Crear usuario</h3>

        <form onSubmit={handleCreate} className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usuario@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="mostrador">Mostrador</option>
              <option value="taller">Taller</option>
              <option value="corte">Corte</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={cargando}
            >
              {cargando ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalUsuario, setModalUsuario] = useState<UsuarioRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios."
      );
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm uppercase">
            Usuarios ({usuarios.length})
          </h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              + Crear usuario
            </Button>
            <Button size="sm" variant="ghost" onClick={cargar}>
              Refrescar
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="text-gray-400 text-sm text-center py-8">
            Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 font-medium text-gray-500">Email</th>
                  <th className="py-2 px-3 font-medium text-gray-500">Nombre</th>
                  <th className="py-2 px-3 font-medium text-gray-500">Rol</th>
                  <th className="py-2 px-3 font-medium text-gray-500">Creado</th>
                  <th className="py-2 px-3 font-medium text-gray-500 hidden md:table-cell">
                    Último acceso
                  </th>
                  <th className="py-2 px-3 font-medium text-gray-500 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{u.email}</td>
                    <td className="py-2 px-3 text-gray-600">{u.nombre || "—"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.rol === "superadmin"
                            ? "bg-red-100 text-red-700"
                            : u.rol === "admin"
                              ? "bg-purple-100 text-purple-700"
                            : u.rol === "taller"
                              ? "bg-blue-100 text-blue-700"
                              : u.rol === "corte"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {u.rol || "—"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-500 text-xs">
                      {u.creado
                        ? new Date(u.creado).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-500 text-xs hidden md:table-cell">
                      {u.ultimoLogin
                        ? new Date(u.ultimoLogin).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setModalUsuario(u)}
                      >
                        Reset
                      </Button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUsuario && (
        <ResetModal
          usuario={modalUsuario}
          onClose={() => setModalUsuario(null)}
          onDone={() => {
            setModalUsuario(null);
            cargar();
          }}
        />
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
