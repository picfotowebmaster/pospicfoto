import { DATOS_EMPRESA, POLITICAS } from "@/lib/utils/constantes";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function urlAbsoluta(valor: string | null | undefined, baseUrl?: string): string {
  if (!valor) return "";
  if (/^https?:\/\//i.test(valor)) return valor;
  if (!baseUrl) return valor;
  const base = baseUrl.replace(/\/$/, "");
  const ruta = valor.startsWith("/") ? valor : `/${valor}`;
  return `${base}${ruta}`;
}

export function renderTicketHtml(
  pedido: Pedido,
  emisor?: EntidadEmisora | null,
  baseUrl?: string,
): string {
  const numeroTicket = pedido.numero_pedido || pedido.id.slice(0, 8).toUpperCase();
  const nombre = emisor?.nombre_comercial || DATOS_EMPRESA.nombre;
  const razonSocial = emisor?.razon_social || DATOS_EMPRESA.nombre;
  const rfc = emisor?.rfc || DATOS_EMPRESA.rfc;
  const direccion = emisor?.direccion || DATOS_EMPRESA.direccion;
  const telefonos = emisor?.telefonos || DATOS_EMPRESA.telefono;
  const correo = emisor?.email || DATOS_EMPRESA.correo;
  const logo = urlAbsoluta(emisor?.logo_url, baseUrl);

  const lineas = (pedido.detalle_pedidos ?? [])
    .map((d) => {
      const atributos = d.atributos
        ? Object.entries(d.atributos)
            .map(
              ([k, v]) =>
                `<div style="font-size:11px;color:#6b7280;">${esc(k)}: ${esc(v)}</div>`,
            )
            .join("")
        : "";

      return `
        <tr>
          <td style="padding:6px 0;border-bottom:1px dotted #d1d5db;">
            <div style="font-weight:600;color:#111827;">${esc(d.producto_nombre)}</div>
            ${atributos}
          </td>
          <td style="padding:6px 0;border-bottom:1px dotted #d1d5db;text-align:center;color:#111827;">${esc(d.cantidad)}</td>
          <td style="padding:6px 0;border-bottom:1px dotted #d1d5db;text-align:right;color:#111827;">${money(d.importe_linea)}</td>
        </tr>`;
    })
    .join("");

  const politicas = POLITICAS.map(
    (p) => `<div style="font-size:11px;color:#6b7280;">${esc(p)}</div>`,
  ).join("");

  return `
  <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; color:#1f2937;">
    <div style="text-align:center;border-bottom:1px dashed #9ca3af;padding-bottom:12px;margin-bottom:12px;">
      ${logo ? `<img src="${esc(logo)}" alt="${esc(nombre)}" width="72" height="72" style="display:block;margin:0 auto 6px;max-width:72px;max-height:72px;object-fit:contain;" />` : ""}
      <div style="font-size:18px;font-weight:bold;color:#111827;">${esc(nombre)}</div>
      ${razonSocial && razonSocial !== nombre ? `<div style="font-size:12px;color:#374151;">${esc(razonSocial)}</div>` : ""}
      <div style="font-size:12px;">RFC: ${esc(rfc)}</div>
      ${emisor?.regimen_fiscal ? `<div style="font-size:10px;color:#6b7280;">${esc(emisor.regimen_fiscal)}</div>` : ""}
      <div style="font-size:11px;color:#6b7280;">${esc(direccion)}</div>
      <div style="font-size:11px;color:#6b7280;">Tel: ${esc(telefonos)}</div>
      <div style="font-size:11px;color:#6b7280;">Correo: ${esc(correo)}</div>
      ${emisor?.sitio_web ? `<div style="font-size:11px;color:#6b7280;">${esc(emisor.sitio_web)}</div>` : ""}
    </div>

    <table style="width:100%;font-size:12px;margin-bottom:12px;">
      <tr><td style="font-weight:bold;width:90px;">Ticket:</td><td>${esc(numeroTicket)}</td></tr>
      <tr><td style="font-weight:bold;">Fecha:</td><td>${esc(pedido.fecha_recepcion)} ${esc(pedido.hora_recepcion?.slice(0, 5))}</td></tr>
      <tr><td style="font-weight:bold;">Cliente:</td><td>${esc(pedido.cliente_nombre)}</td></tr>
      ${pedido.cliente_telefono ? `<tr><td style="font-weight:bold;">Tel:</td><td>${esc(pedido.cliente_telefono)}</td></tr>` : ""}
      <tr><td style="font-weight:bold;">Entrega:</td><td>${esc(pedido.fecha_entrega)} ${esc(pedido.hora_entrega?.slice(0, 5))}</td></tr>
    </table>

    <table style="width:100%;font-size:12px;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid #111827;">
          <th style="text-align:left;padding-bottom:6px;">Producto</th>
          <th style="text-align:center;padding-bottom:6px;">Cant</th>
          <th style="text-align:right;padding-bottom:6px;">Importe</th>
        </tr>
      </thead>
      <tbody>${lineas}</tbody>
    </table>

    <table style="width:100%;font-size:12px;margin-top:12px;border-top:1px solid #111827;padding-top:6px;">
      <tr><td style="font-weight:bold;">Subtotal:</td><td style="text-align:right;">${money(pedido.subtotal)}</td></tr>
      <tr><td style="font-weight:bold;">Anticipo:</td><td style="text-align:right;">${money(pedido.anticipo)}</td></tr>
      <tr><td style="font-weight:bold;font-size:14px;">Total:</td><td style="text-align:right;font-weight:bold;font-size:14px;">${money(pedido.total)}</td></tr>
      <tr><td style="font-weight:bold;">Pago:</td><td style="text-align:right;">${esc(pedido.metodo_pago)}</td></tr>
    </table>

    <div style="border-top:1px dashed #9ca3af;margin-top:12px;padding-top:12px;text-align:center;">
      ${politicas}
    </div>
  </div>`;
}
