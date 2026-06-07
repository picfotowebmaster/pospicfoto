import React from "react";
import { DATOS_EMPRESA, POLITICAS } from "@/lib/utils/constantes";
import type { Pedido } from "@/lib/supabase/types";

interface TicketTemplateProps {
  pedido: Pedido;
}

export function TicketTemplate({ pedido }: TicketTemplateProps) {
  return (
    <div className="ticket-container max-w-[72mm] mx-auto font-mono text-[10px] leading-tight text-black bg-white">
      <div className="text-center mb-1">
        <div className="font-bold text-xs">{DATOS_EMPRESA.nombre}</div>
        <div>RFC: {DATOS_EMPRESA.rfc}</div>
        <div className="text-[8px]">{DATOS_EMPRESA.direccion}</div>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-0.5 mb-1">
        <div>
          <span className="font-bold">Ticket:</span>{" "}
          {pedido.id.slice(0, 8).toUpperCase()}
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
        <div className="font-bold border-b border-gray-300 pb-0.5">
          <span className="inline-block w-[65%]">Producto</span>
          <span className="inline-block w-[10%] text-center">Cant</span>
          <span className="inline-block w-[25%] text-right">Importe</span>
        </div>
        {pedido.detalle_pedidos?.map((d) => (
          <div key={d.id} className="py-0.5 border-b border-dotted border-gray-200">
            <div className="font-semibold">{d.producto_nombre}</div>
            {d.atributos &&
              Object.entries(d.atributos).map(([k, v]) => (
                <div key={k} className="text-[8px] text-gray-600">
                  {k}: {v}
                </div>
              ))}
            <div>
              <span className="inline-block w-[65%]"></span>
              <span className="inline-block w-[10%] text-center">{d.cantidad}</span>
              <span className="inline-block w-[25%] text-right">
                ${d.importe_linea.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-black pt-0.5 mb-1">
        <div>
          <span className="font-bold">Subtotal:</span>{" "}
          <span className="float-right">${pedido.subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span className="font-bold">Anticipo:</span>{" "}
          <span className="float-right">${pedido.anticipo.toFixed(2)}</span>
        </div>
        <div>
          <span className="font-bold">Total:</span>{" "}
          <span className="float-right">${pedido.total.toFixed(2)}</span>
        </div>
        <div>
          <span className="font-bold">Pago:</span> {pedido.metodo_pago}
        </div>
      </div>

      <div className="text-[8px] text-center border-t border-dashed border-gray-400 pt-1">
        {POLITICAS.map((p, i) => (
          <div key={i}>{p}</div>
        ))}
      </div>
    </div>
  );
}
