import React from "react";
import { DATOS_EMPRESA, POLITICAS } from "@/lib/utils/constantes";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";

interface TicketTemplateProps {
  pedido: Pedido;
  emisor?: EntidadEmisora | null;
}

export function TicketTemplate({ pedido, emisor }: TicketTemplateProps) {
  const nombre = emisor?.nombre_comercial || DATOS_EMPRESA.nombre;
  const razonSocial = emisor?.razon_social || DATOS_EMPRESA.nombre;
  const rfc = emisor?.rfc || DATOS_EMPRESA.rfc;
  const direccion = emisor?.direccion || DATOS_EMPRESA.direccion;
  const telefonos = emisor?.telefonos || DATOS_EMPRESA.telefono;
  const correo = emisor?.email || DATOS_EMPRESA.correo;
  const logo = emisor?.logo_url || "/icons/icon-128.png";

  return (
    <div className="ticket-container max-w-[72mm] mx-auto font-mono text-[10px] leading-tight text-black bg-white">
      <div className="text-center mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={`Logotipo de ${nombre}`}
          width={128}
          height={128}
          className="mx-auto mb-1 h-[16mm] w-[16mm] object-contain"
        />
        <div className="font-bold text-xs">{nombre}</div>
        {razonSocial && razonSocial !== nombre && (
          <div className="text-[9px]">{razonSocial}</div>
        )}
        <div>RFC: {rfc}</div>
        {emisor?.regimen_fiscal && (
          <div className="text-[8px]">{emisor.regimen_fiscal}</div>
        )}
        <div className="text-[8px]">{direccion}</div>
        <div>Tel: {telefonos}</div>
        <div>Correo: {correo}</div>
        {emisor?.sitio_web && <div>{emisor.sitio_web}</div>}
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-0.5 mb-1">
        <div>
          <span className="font-bold">Ticket:</span>{" "}
          {pedido.numero_pedido || pedido.id.slice(0, 8).toUpperCase()}
        </div>
        <div>
          <span className="font-bold">Fecha:</span> {pedido.fecha_recepcion} -{" "}
          {pedido.hora_recepcion?.slice(0, 5)}
        </div>
        <div>
          <span className="font-bold">Cliente:</span> {pedido.cliente_nombre}
        </div>
        {pedido.cliente_telefono && (
          <div>
            <span className="font-bold">Tel:</span> {pedido.cliente_telefono}
          </div>
        )}
        <div>
          <span className="font-bold">Entrega:</span> {pedido.fecha_entrega}{" "}
          {pedido.hora_entrega?.slice(0, 5)}
        </div>
      </div>

      <div className="mb-1">
        <div className="grid grid-cols-[minmax(0,1fr)_9mm_20mm] font-bold border-b border-gray-300 pb-0.5">
          <span>Producto</span>
          <span className="text-center">Cant</span>
          <span className="text-right">Importe</span>
        </div>
        {pedido.detalle_pedidos?.map((d) => (
          <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_9mm_20mm] py-0.5 border-b border-dotted border-gray-200">
            <div className="min-w-0">
              <div className="font-semibold">{d.producto_nombre}</div>
              {d.atributos &&
                Object.entries(d.atributos).map(([k, v]) => (
                  <div key={k} className="text-[8px] text-gray-600">
                    {k}: {v}
                  </div>
                ))}
            </div>
            <span className="text-center">{d.cantidad}</span>
            <span className="text-right">${d.importe_linea.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-black pt-0.5 mb-1">
        <div className="flex justify-between gap-2">
          <span className="font-bold">Subtotal:</span>
          <span>${pedido.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="font-bold">Anticipo:</span>
          <span>${pedido.anticipo.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="font-bold">Total:</span>
          <span>${pedido.total.toFixed(2)}</span>
        </div>
        <div>
          <span className="font-bold">Pago:</span> {pedido.metodo_pago}
        </div>
      </div>

      <div className="text-[8px] text-center border-t border-dashed border-gray-400 pt-1">
        {POLITICAS.map((p) => (
          <div key={p}>{p}</div>
        ))}
      </div>
    </div>
  );
}
