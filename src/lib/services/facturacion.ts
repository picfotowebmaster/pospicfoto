export interface LineaFactura {
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ConfigFactura {
  tasaIVA: number;
  regimenEmisor: string;
  cpExpedicion: string;
  folio: string;
  serie?: string;
  formaPago: string;
  metodoPago: string;
}

export interface DesgloseLinea {
  valorUnitarioNeto: number;
  importeNeto: number;
  importeIVA: number;
}

export interface TotalesFactura {
  detalles: DesgloseLinea[];
  subtotal: number;
  iva: number;
  total: number;
}

export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function desglosarLinea(
  cantidad: number,
  precioConIVA: number,
  tasaIVA: number,
): DesgloseLinea {
  const valorUnitarioNeto = redondear2(precioConIVA / (1 + tasaIVA));
  const importeNeto = redondear2(valorUnitarioNeto * cantidad);
  const importeIVA = redondear2(importeNeto * tasaIVA);
  return { valorUnitarioNeto, importeNeto, importeIVA };
}

export function desglosarTotales(
  lineas: LineaFactura[],
  tasaIVA: number,
): TotalesFactura {
  const detalles = lineas.map((l) =>
    desglosarLinea(l.cantidad, l.precio_unitario, tasaIVA),
  );
  const subtotal = redondear2(detalles.reduce((s, d) => s + d.importeNeto, 0));
  const iva = redondear2(detalles.reduce((s, d) => s + d.importeIVA, 0));
  const total = redondear2(subtotal + iva);
  return { detalles, subtotal, iva, total };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatearFechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
}

function sanitizar(valor: string): string {
  return valor.replace(/[\r\n|]+/g, " ").trim();
}

function attr(nombre: string, valor: string): string {
  return `||${nombre}|${valor}`;
}

export function construirDocumentoTxt(
  lineas: LineaFactura[],
  config: ConfigFactura,
  fecha: Date = new Date(),
): string {
  const { detalles, subtotal, iva, total } = desglosarTotales(
    lineas,
    config.tasaIVA,
  );

  const registros: string[] = [];

  let com = "COM|||version|4.0";
  if (config.serie) com += attr("serie", sanitizar(config.serie));
  com += attr("folio", sanitizar(config.folio));
  com += attr("fecha", formatearFechaISO(fecha));
  com += attr("FormaPago", config.formaPago);
  com += attr("subTotal", subtotal.toFixed(2));
  com += attr("Moneda", "MXN");
  com += attr("TipoCambio", "1.0");
  com += attr("total", total.toFixed(2));
  com += attr("tipoDeComprobante", "I");
  com += attr("Exportacion", "01");
  com += attr("MetodoPago", config.metodoPago);
  registros.push(com);

  registros.push(
    `IGL|||Periodicidad|04||Meses|${pad(fecha.getMonth() + 1)}||Año|${fecha.getFullYear()}`,
  );

  registros.push(`EMI|||Regimen|${sanitizar(config.regimenEmisor)}`);

  registros.push(
    "REC|||rfc|XAXX010101000||nombre|PUBLICO EN GENERAL||UsoCFDI|S01||RegimenFiscalReceptor|616",
  );

  registros.push(`DOR|||codigoPostal|${sanitizar(config.cpExpedicion)}`);

  lineas.forEach((linea, i) => {
    const d = detalles[i];
    let con = "CON|||ClaveProdServ|01010101";
    con += attr("cantidad", linea.cantidad.toFixed(2));
    con += attr("ClaveUnidad", "H87");
    con += attr("unidad", "Pieza");
    con += attr("descripcion", sanitizar(linea.producto_nombre));
    con += attr("valorUnitario", d.valorUnitarioNeto.toFixed(2));
    con += attr("importe", d.importeNeto.toFixed(2));
    con += attr("ObjetoImp", "02");
    registros.push(con);

    registros.push(
      `CONIT|||Base|${d.importeNeto.toFixed(2)}||Impuesto|002||TipoFactor|Tasa||TasaOCuota|${config.tasaIVA.toFixed(2)}||Importe|${d.importeIVA.toFixed(2)}`,
    );
  });

  registros.push(
    `TRA|||Base|${subtotal.toFixed(2)}||impuesto|002||TipoFactor|Tasa||TasaOCuota|${config.tasaIVA.toFixed(2)}||importe|${iva.toFixed(2)}`,
  );

  return registros.join("\n");
}
