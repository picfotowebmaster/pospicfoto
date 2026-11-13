import { describe, it, expect, afterEach } from "vitest";
import { resolverBaseUrl, urlTicketCompartido } from "./baseUrl";

describe("resolverBaseUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("usa el origen cuando no hay configuración", () => {
    expect(resolverBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("prioriza NEXT_PUBLIC_APP_URL y quita la barra final", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pos.picfoto.mx/";
    expect(resolverBaseUrl("http://localhost:3000")).toBe(
      "https://pos.picfoto.mx",
    );
  });

  it("construye la URL pública del ticket", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pos.picfoto.mx";
    expect(urlTicketCompartido("http://localhost:3000", "abc123")).toBe(
      "https://pos.picfoto.mx/t/abc123",
    );
  });
});
