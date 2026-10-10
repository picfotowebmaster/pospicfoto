"use client";

import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale";
import { Autocompletar } from "@/components/ui/Autocompletar";
import { useAutocompletar } from "@/lib/hooks/useAutocompletar";
import { buscarClientes, type ClienteHistorial } from "@/lib/services/pedidos";
import { redondearA30Min } from "@/lib/utils/pedido";

function fechaLocal(fecha: string): Date | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function horaLocal(hora: string): Date | null {
  if (!hora) return null;
  const [horas, minutos] = hora.split(":").map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
}

function formatoFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatoHora(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

interface FormClienteProps {
  nombre: string;
  telefono: string;
  email: string;
  fechaEntrega: string;
  horaEntrega: string;
  onNombreChange: (v: string) => void;
  onTelefonoChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onFechaEntregaChange: (v: string) => void;
  onHoraEntregaChange: (v: string) => void;
}

export function FormCliente({
  nombre,
  telefono,
  email,
  fechaEntrega,
  horaEntrega,
  onNombreChange,
  onTelefonoChange,
  onEmailChange,
  onFechaEntregaChange,
  onHoraEntregaChange,
}: FormClienteProps) {
  const renderCliente = (c: ClienteHistorial) =>
    c.telefono ? `${c.nombre} · ${c.telefono}` : c.nombre;

  const autocompletar = useAutocompletar<ClienteHistorial>({
    fetchFn: buscarClientes,
    onSelect: (c) => {
      onNombreChange(c.nombre);
      onTelefonoChange(c.telefono ?? "");
      onEmailChange(c.email ?? "");
    },
    renderItem: renderCliente,
    minChars: 2,
    idFromItem: (c) => `${c.telefono ?? ""}-${c.nombre}`,
  });

  useEffect(() => {
    const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horaEntrega);
    const minutos = Number(horaEntrega.slice(-2));
    if (horaValida && minutos % 30 !== 0) {
      onHoraEntregaChange(redondearA30Min(horaEntrega));
    }
  }, [horaEntrega, onHoraEntregaChange]);

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
            Teléfono <span className="text-gray-400">(busca clientes existentes)</span>
          </label>
          <Autocompletar
            id="cliente-telefono"
            placeholder="55 1234 5678"
            valor={telefono}
            onChange={(v) => {
              autocompletar.buscar(v);
              onTelefonoChange(v);
            }}
            opciones={autocompletar.opciones}
            renderOpcion={renderCliente}
            onSelect={autocompletar.seleccionar}
            abierto={autocompletar.abierto}
            cargando={autocompletar.cargando}
            indiceSeleccionado={autocompletar.indiceSeleccionado}
            onKeyDown={autocompletar.tecla}
            containerRef={autocompletar.containerRef}
            inputRef={autocompletar.inputRef}
            idFromItem={(c) => `${c.telefono ?? ""}-${c.nombre}`}
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
          <label htmlFor="cliente-fecha-entrega" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Fecha de Entrega *
          </label>
          <DatePicker
            id="cliente-fecha-entrega"
            selected={fechaLocal(fechaEntrega)}
            onChange={(fecha) => onFechaEntregaChange(fecha ? formatoFecha(fecha) : "")}
            selectsRange={false}
            selectsMultiple={false}
            dateFormat="dd/MM/yyyy"
            locale={es}
            placeholderText="Seleccionar fecha..."
            calendarClassName="pos-date-calendar"
            popperClassName="pos-datepicker-popper"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            showPopperArrow={false}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="cliente-hora-entrega" className="block text-xs font-medium text-gray-500 mb-1">
            Hora de Entrega *
          </label>
          <DatePicker
            id="cliente-hora-entrega"
            selected={horaLocal(horaEntrega)}
            onChange={(hora) => onHoraEntregaChange(hora ? formatoHora(hora) : "")}
            selectsRange={false}
            selectsMultiple={false}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={30}
            timeCaption="Hora"
            dateFormat="HH:mm"
            locale={es}
            placeholderText="Seleccionar hora..."
            calendarClassName="pos-date-calendar"
            popperClassName="pos-datepicker-popper"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            showPopperArrow={false}
            autoComplete="off"
            isClearable
          />
        </div>
      </div>
    </div>
  );
}
