"use client";

import React from "react";

interface FormClienteProps {
  nombre: string;
  telefono: string;
  email: string;
  fechaEntrega: string;
  horaEntrega: string;
  requiereCorreccion: boolean;
  onNombreChange: (v: string) => void;
  onTelefonoChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onFechaEntregaChange: (v: string) => void;
  onHoraEntregaChange: (v: string) => void;
  onRequiereCorreccionChange: (v: boolean) => void;
}

export function FormCliente({
  nombre,
  telefono,
  email,
  fechaEntrega,
  horaEntrega,
  requiereCorreccion,
  onNombreChange,
  onTelefonoChange,
  onEmailChange,
  onFechaEntregaChange,
  onHoraEntregaChange,
  onRequiereCorreccionChange,
}: FormClienteProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
        Datos del Cliente
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="cliente-nombre" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Nombre del Cliente *
          </label>
          <input
            id="cliente-nombre"
            type="text"
            value={nombre}
            onChange={(e) => onNombreChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <label htmlFor="cliente-telefono" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Teléfono
          </label>
          <input
            id="cliente-telefono"
            type="text"
            value={telefono}
            onChange={(e) => onTelefonoChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="55 1234 5678"
          />
        </div>
        <div>
          <label htmlFor="cliente-email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Correo (para factura)
          </label>
          <input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@correo.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Fecha de Entrega *
          </label>
          <input
            type="date"
            value={fechaEntrega}
            onChange={(e) => onFechaEntregaChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Hora de Entrega *
          </label>
          <input
            type="time"
            value={horaEntrega}
            onChange={(e) => onHoraEntregaChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={requiereCorreccion}
          onChange={(e) => onRequiereCorreccionChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Requiere Corrección de Color</span>
      </label>
    </div>
  );
}
