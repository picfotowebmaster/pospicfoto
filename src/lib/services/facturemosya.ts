import { XMLParser } from "fast-xml-parser";

export interface RespuestaTimbrado {
  codigo: string;
  descripcion: string;
  timbrefiscal?: string;
  documentopdf?: string;
  imagencbb?: string;
}

export interface CredencialesFacturemosya {
  url: string;
  usuario: string;
  password: string;
}

const SOAP_ACTION =
  "http://www.facturemosya.com/webservice/timbrarCfdi4_0.php/RecibirTXT";

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

export function construirEnvelope(
  usuario: string,
  password: string,
  documento: string,
  consecutivo = "1",
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.facturemosya.com/soap/RecibirComprobanteParaTimbrado" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:RecibirTXT>
      <usuario xsi:type="xsd:string">${escaparXML(usuario)}</usuario>
      <contra xsi:type="xsd:string">${escaparXML(password)}</contra>
      <documento xsi:type="xsd:string">${escaparXML(documento)}</documento>
      <consecutivo xsi:type="xsd:string">${escaparXML(consecutivo)}</consecutivo>
    </ns1:RecibirTXT>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

const CAMPOS = new Set([
  "codigo",
  "descripcion",
  "timbrefiscal",
  "documentopdf",
  "imagencbb",
  "faultstring",
  "faultcode",
]);

export function parsearRespuesta(xml: string): RespuestaTimbrado {
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
    timbrefiscal: resultado.timbrefiscal,
    documentopdf: resultado.documentopdf,
    imagencbb: resultado.imagencbb,
  };
}

function limpiarTexto(valor: string, max = 500): string {
  return valor.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function timbrarTxt(
  credenciales: CredencialesFacturemosya,
  documento: string,
  consecutivo = "1",
): Promise<RespuestaTimbrado> {
  const envelope = construirEnvelope(
    credenciales.usuario,
    credenciales.password,
    documento,
    consecutivo,
  );

  const res = await fetch(credenciales.url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: SOAP_ACTION,
    },
    body: envelope,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`FacturemosYa respondió HTTP ${res.status}`);
  }

  const respuesta = parsearRespuesta(text);

  if (!respuesta.codigo && !respuesta.descripcion) {
    console.error("Respuesta completa de FacturemosYa:", text);
    const resumen = limpiarTexto(text);
    throw new Error(
      `FacturemosYa devolvió una respuesta no reconocida${resumen ? `: ${resumen}` : ""}`,
    );
  }

  return respuesta;
}
