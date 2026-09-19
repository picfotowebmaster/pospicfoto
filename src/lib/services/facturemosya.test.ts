import { describe, it, expect, vi, afterEach } from "vitest";
import { parsearRespuesta, timbrarTxt, construirEnvelope } from "./facturemosya";

const RESP_EXITO = `<?xml version="1.0"?>
<Envelope>
  <Body>
    <RecibirTXTResponse>
      <respuesta>
        <codigo xsi:type="xsd:string">201</codigo>
        <descripcion xsi:type="xsd:string">cfdi timbrado</descripcion>
        <timbrefiscal xsi:type="xsd:string">1.1|8FB84357-A5A3-A842-AE09-4A84ACA916A0|2026-08-20T12:48:45|sello|30001000000400002495|selloSAT</timbrefiscal>
        <documentopdf xsi:type="xsd:string">JVBERi0x</documentopdf>
        <imagencbb xsi:type="xsd:string">iVBORw0</imagencbb>
      </respuesta>
    </RecibirTXTResponse>
  </Body>
</Envelope>`;

const RESP_FAULT = `<?xml version="1.0"?>
<Envelope>
  <Body>
    <Fault>
      <faultcode>SOAP-ENV:Server</faultcode>
      <faultstring>Error interno del proveedor</faultstring>
    </Fault>
  </Body>
</Envelope>`;

describe("parsearRespuesta", () => {
  it("extrae codigo, descripcion y timbrefiscal", () => {
    const r = parsearRespuesta(RESP_EXITO);
    expect(r.codigo).toBe("201");
    expect(r.descripcion).toBe("cfdi timbrado");
    expect(r.timbrefiscal).toBe(
      "1.1|8FB84357-A5A3-A842-AE09-4A84ACA916A0|2026-08-20T12:48:45|sello|30001000000400002495|selloSAT",
    );
  });

  it("extrae campos con xsi:type y envoltura <respuesta>", () => {
    const r = parsearRespuesta(RESP_EXITO);
    expect(r.codigo).toBe("201");
    expect(r.documentopdf).toBe("JVBERi0x");
    expect(r.imagencbb).toBe("iVBORw0");
  });

  it("el UUID del timbre fiscal es la segunda parte del pipe", () => {
    const r = parsearRespuesta(RESP_EXITO);
    const uuid = (r.timbrefiscal ?? "").split("|")[1];
    expect(uuid).toBe("8FB84357-A5A3-A842-AE09-4A84ACA916A0");
  });

  it("convierte un SOAP Fault en descripcion", () => {
    const r = parsearRespuesta(RESP_FAULT);
    expect(r.codigo).toBe("");
    expect(r.descripcion).toBe("Fallo SOAP: Error interno del proveedor");
  });
});

describe("construirEnvelope", () => {
  it("escapa los valores XML", () => {
    const env = construirEnvelope("u&1", "p<2", "doc>3");
    expect(env).toContain("<usuario");
    expect(env).toContain("u&amp;1");
    expect(env).toContain("p&lt;2");
    expect(env).toContain("doc&gt;3");
  });
});

describe("timbrarTxt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lanza error con la respuesta cruda cuando no se reconoce", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<html><body>Error del proveedor</body></html>",
      }),
    );

    await expect(
      timbrarTxt(
        { url: "http://x", usuario: "u", password: "p" },
        "documento",
      ),
    ).rejects.toThrow("FacturemosYa devolvió una respuesta no reconocida");
  });

  it("lanza error de HTTP cuando el status no es ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "",
      }),
    );

    await expect(
      timbrarTxt(
        { url: "http://x", usuario: "u", password: "p" },
        "documento",
      ),
    ).rejects.toThrow("FacturemosYa respondió HTTP 500");
  });

  it("devuelve la respuesta parseada en éxito", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => RESP_EXITO,
      }),
    );

    const r = await timbrarTxt(
      { url: "http://x", usuario: "u", password: "p" },
      "documento",
    );
    expect(r.codigo).toBe("201");
    expect(r.descripcion).toBe("cfdi timbrado");
  });
});
