import { describe, it, expect } from "vitest";
import {
  desglosarLinea,
  desglosarTotales,
  construirDocumentoTxt,
  formatearFechaISO,
} from "./facturacion";

const TASA = 0.16;

describe("desglosarLinea", () => {
  it("desglosa IVA incluido en un precio unitario", () => {
    const d = desglosarLinea(1, 116, TASA);
    expect(d.valorUnitarioNeto).toBe(100);
    expect(d.importeNeto).toBe(100);
    expect(d.importeIVA).toBe(16);
  });

  it("desglosa múltiples cantidades", () => {
    const d = desglosarLinea(3, 116, TASA);
    expect(d.valorUnitarioNeto).toBe(100);
    expect(d.importeNeto).toBe(300);
    expect(d.importeIVA).toBe(48);
  });

  it("redondea a 2 decimales", () => {
    const d = desglosarLinea(1, 99.99, TASA);
    expect(d.valorUnitarioNeto).toBeCloseTo(86.2, 2);
    expect(d.importeIVA).toBeCloseTo(13.79, 2);
  });
});

describe("desglosarTotales", () => {
  it("calcula subtotal, IVA y total consistentes", () => {
    const lineas = [
      { producto_nombre: "A", cantidad: 1, precio_unitario: 116 },
      { producto_nombre: "B", cantidad: 2, precio_unitario: 58 },
    ];
    const t = desglosarTotales(lineas, TASA);
    expect(t.subtotal).toBe(200);
    expect(t.iva).toBe(32);
    expect(t.total).toBe(232);
  });

  it("el IVA total es la suma del IVA por línea", () => {
    const lineas = [
      { producto_nombre: "A", cantidad: 3, precio_unitario: 99.99 },
      { producto_nombre: "B", cantidad: 1, precio_unitario: 25.5 },
    ];
    const t = desglosarTotales(lineas, TASA);
    const ivaLineas = t.detalles.reduce((s, d) => s + d.importeIVA, 0);
    expect(t.iva).toBeCloseTo(ivaLineas, 2);
    expect(t.total).toBeCloseTo(t.subtotal + t.iva, 2);
  });
});

describe("construirDocumentoTxt", () => {
  const config = {
    tasaIVA: TASA,
    regimenEmisor: "612",
    cpExpedicion: "06000",
    folio: "1",
    formaPago: "01",
    metodoPago: "PUE",
  };

  it("genera las líneas requeridas para público en general", () => {
    const fecha = new Date(2026, 7, 17, 10, 30, 5);
    const txt = construirDocumentoTxt(
      [{ producto_nombre: "Foto 4x6", cantidad: 2, precio_unitario: 58 }],
      config,
      fecha,
    );

    expect(txt).toContain("COM|||version|4.0");
    expect(txt).toContain("fecha|2026-08-17T10:30:05");
    expect(txt).toContain("MetodoPago|PUE");
    expect(txt).toContain("IGL|||Periodicidad|04");
    expect(txt).toContain("EMI|||Regimen|612");
    expect(txt).toContain(
      "REC|||rfc|XAXX010101000||nombre|PUBLICO EN GENERAL||UsoCFDI|S01||RegimenFiscalReceptor|616",
    );
    expect(txt).toContain("DOR|||codigoPostal|06000");
  });

  it("incluye un CON y CONIT por cada línea y la línea TRA", () => {
    const txt = construirDocumentoTxt(
      [
        { producto_nombre: "Foto", cantidad: 1, precio_unitario: 116 },
        { producto_nombre: "Marco", cantidad: 2, precio_unitario: 58 },
      ],
      config,
      new Date(2026, 7, 17),
    );

    expect(txt.match(/^CON\|\|\|/gm)).toHaveLength(2);
    expect(txt.match(/^CONIT\|\|\|/gm)).toHaveLength(2);
    expect(txt.match(/^TRA\|\|\|/gm)).toHaveLength(1);
    expect(txt).toContain("TRA|||Base|200.00");
    expect(txt).toContain("importe|32.00");
  });

  it("desglosa el valor unitario sin IVA en el concepto", () => {
    const txt = construirDocumentoTxt(
      [{ producto_nombre: "Foto", cantidad: 1, precio_unitario: 116 }],
      config,
      new Date(2026, 7, 17),
    );
    expect(txt).toContain("valorUnitario|100.00");
    expect(txt).toContain("importe|100.00");
  });

  it("sanitiza delimitadores en la descripción", () => {
    const txt = construirDocumentoTxt(
      [{ producto_nombre: "Foto | grande", cantidad: 1, precio_unitario: 116 }],
      config,
      new Date(2026, 7, 17),
    );
    expect(txt).toContain("descripcion|Foto   grande");
  });
});

describe("formatearFechaISO", () => {
  it("formatea con ceros a la izquierda", () => {
    expect(formatearFechaISO(new Date(2026, 0, 5, 9, 3, 7))).toBe(
      "2026-01-05T09:03:07",
    );
  });
});
