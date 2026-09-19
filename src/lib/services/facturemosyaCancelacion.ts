import { XMLParser } from "fast-xml-parser";
import type { CredencialesFacturemosya } from "./facturemosya";

export interface RespuestaCancelacion {
  codigo: string;
  descripcion: string;
  fecha?: string;
}

export const MOTIVOS_CANCELACION = ["01", "02", "03", "04"] as const;
export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number];

const SOAP_ACTION_CANCELAR =
  "http://www.facturemosya.com/webservice/wsCancelarCFDI22.php/CancelarCFDI";
const SOAP_ACTION_STATUS =
  "http://www.facturemosya.com/webservice/wsCancelarCFDI22.php/comprobarStatusCancelacion";

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  trimValues: true,
});

function escaparXML(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function construirEnvelopeCancelacion(
  usuario: string,
  contra: string,
  uuid: string,
  motivo: string,
  uuidRelacionado: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.facturemosya.com/soap/CancelarComprobanteFiscalDigital" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:CancelarCFDI>
      <usuario xsi:type="xsd:string">${escaparXML(usuario)}</usuario>
      <contra xsi:type="xsd:string">${escaparXML(contra)}</contra>
      <uuid xsi:type="xsd:string">${escaparXML(uuid)}</uuid>
      <motivo xsi:type="xsd:string">${escaparXML(motivo)}</motivo>
      <uuid_relacionado xsi:type="xsd:string">${escaparXML(uuidRelacionado)}</uuid_relacionado>
    </ns1:CancelarCFDI>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

export function construirEnvelopeStatus(
  usuario: string,
  contra: string,
  uuid: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.facturemosya.com/soap/CancelarComprobanteFiscalDigital" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:comprobarStatusCancelacion>
      <usuario xsi:type="xsd:string">${escaparXML(usuario)}</usuario>
      <contra xsi:type="xsd:string">${escaparXML(contra)}</contra>
      <uuid xsi:type="xsd:string">${escaparXML(uuid)}</uuid>
    </ns1:comprobarStatusCancelacion>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

const CAMPOS = new Set(["codigo", "descripcion", "fecha", "faultstring"]);

export function parsearRespuestaCancelacion(xml: string): RespuestaCancelacion {
  const doc = parser.parse(xml);

  const resultado: Record<string, string> = {};

  function guardar(k: string, v: unknown): void {
    if (!CAMPOS.has(k)) return;
    if (typeof v === "string" || typeof v === "number") {
      resultado[k] = String(v);
      return;
    }
    if (v && typeof v === "object") {
      const texto = (v as Record<string, unknown>)["#text"];
      if (typeof texto === "string" || typeof texto === "number") {
        resultado[k] = String(texto);
      }
    }
  }

  function recorrer(nodo: unknown): void {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }
    if (!nodo || typeof nodo !== "object") return;

    const obj = nodo as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "#text" || k.startsWith("@_")) continue;
      if (CAMPOS.has(k)) {
        guardar(k, v);
        continue;
      }
      if (v && typeof v === "object") {
        recorrer(v);
      }
    }
  }

  recorrer(doc);

  if (!resultado.descripcion && resultado.faultstring) {
    resultado.descripcion = `Fallo SOAP: ${resultado.faultstring}`;
  }

  return {
    codigo: resultado.codigo ?? "",
    descripcion: resultado.descripcion ?? "",
    fecha: resultado.fecha,
  };
}

function limpiarTexto(valor: string, max = 500): string {
  return valor.replace(/\s+/g, " ").trim().slice(0, max);
}

async function postSoap(
  credenciales: CredencialesFacturemosya,
  soapAction: string,
  envelope: string,
): Promise<RespuestaCancelacion> {
  const res = await fetch(credenciales.url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: soapAction,
    },
    body: envelope,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`FacturemosYa respondió HTTP ${res.status}`);
  }

  const respuesta = parsearRespuestaCancelacion(text);

  if (!respuesta.codigo && !respuesta.descripcion) {
    console.error("Respuesta completa de FacturemosYa:", text);
    const resumen = limpiarTexto(text);
    throw new Error(
      `FacturemosYa devolvió una respuesta no reconocida${resumen ? `: ${resumen}` : ""}`,
    );
  }

  return respuesta;
}

export async function cancelarCFDI(
  credenciales: CredencialesFacturemosya,
  uuid: string,
  motivo: string,
  uuidRelacionado = "",
): Promise<RespuestaCancelacion> {
  const envelope = construirEnvelopeCancelacion(
    credenciales.usuario,
    credenciales.password,
    uuid,
    motivo,
    uuidRelacionado,
  );
  return postSoap(credenciales, SOAP_ACTION_CANCELAR, envelope);
}

export async function comprobarStatusCancelacion(
  credenciales: CredencialesFacturemosya,
  uuid: string,
): Promise<RespuestaCancelacion> {
  const envelope = construirEnvelopeStatus(
    credenciales.usuario,
    credenciales.password,
    uuid,
  );
  return postSoap(credenciales, SOAP_ACTION_STATUS, envelope);
}
