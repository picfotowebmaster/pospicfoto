import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cancelarCFDI,
  comprobarStatusCancelacion,
  construirEnvelopeCancelacion,
  parsearRespuestaCancelacion,
} from "./facturemosyaCancelacion";

const RESP_CANCELADA = `<?xml version="1.0"?>
<Envelope>
  <Body>
    <cancelarCFDIResponse>
      <respuesta>
        <codigo xsi:type="xsd:string">201</codigo>
        <descripcion xsi:type="xsd:string">Factura cancelada correctamente</descripcion>
        <fecha xsi:type="xsd:string">2026-09-09 12:00:00</fecha>
      </respuesta>
    </cancelarCFDIResponse>
  </Body>
</Envelope>`;

const RESP_ESPERA = `<?xml version="1.0"?>
<Envelope>
  <Body>
    <cancelarCFDIResponse>
      <respuesta>
        <codigo xsi:type="xsd:string">2001</codigo>
        <descripcion xsi:type="xsd:string">Cancelacion en espera de aceptacion</descripcion>
      </respuesta>
    </cancelarCFDIResponse>
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

describe("construirEnvelopeCancelacion", () => {
  it("incluye los parámetros y escapa los valores", () => {
    const env = construirEnvelopeCancelacion(
      "u&1",
      "p<2",
      "uuid-123",
      "01",
      "uuid-rel",
    );
    expect(env).toContain("<ns1:CancelarCFDI>");
    expect(env).toContain("<usuario");
    expect(env).toContain("u&amp;1");
    expect(env).toContain("p&lt;2");
    expect(env).toContain("<motivo");
    expect(env).toContain("01");
    expect(env).toContain("<uuid_relacionado");
    expect(env).toContain("uuid-rel");
  });
});

describe("parsearRespuestaCancelacion", () => {
  it("extrae codigo, descripcion y fecha", () => {
    const r = parsearRespuestaCancelacion(RESP_CANCELADA);
    expect(r.codigo).toBe("201");
    expect(r.descripcion).toBe("Factura cancelada correctamente");
    expect(r.fecha).toBe("2026-09-09 12:00:00");
  });

  it("extrae el estado en espera", () => {
    const r = parsearRespuestaCancelacion(RESP_ESPERA);
    expect(r.codigo).toBe("2001");
    expect(r.descripcion).toBe("Cancelacion en espera de aceptacion");
  });

  it("convierte un SOAP Fault en descripcion", () => {
    const r = parsearRespuestaCancelacion(RESP_FAULT);
    expect(r.codigo).toBe("");
    expect(r.descripcion).toBe("Fallo SOAP: Error interno del proveedor");
  });
});

describe("cancelarCFDI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
      cancelarCFDI(
        { url: "http://x", usuario: "u", password: "p" },
        "uuid",
        "02",
      ),
    ).rejects.toThrow("FacturemosYa respondió HTTP 500");
  });

  it("devuelve la respuesta parseada en éxito", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => RESP_CANCELADA,
      }),
    );

    const r = await cancelarCFDI(
      { url: "http://x", usuario: "u", password: "p" },
      "uuid",
      "02",
    );
    expect(r.codigo).toBe("201");
  });

  it("envía el UUID relacionado solo cuando se proporciona", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => RESP_CANCELADA,
    });
    vi.stubGlobal("fetch", fetchMock);

    await cancelarCFDI(
      { url: "http://x", usuario: "u", password: "p" },
      "uuid",
      "01",
      "uuid-rel",
    );

    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).toContain("uuid-rel");
  });
});

describe("comprobarStatusCancelacion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa el SOAPAction de comprobarStatusCancelacion", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => RESP_CANCELADA,
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await comprobarStatusCancelacion(
      { url: "http://x", usuario: "u", password: "p" },
      "uuid",
    );
    expect(r.codigo).toBe("201");

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.SOAPAction).toContain("comprobarStatusCancelacion");
  });
});
