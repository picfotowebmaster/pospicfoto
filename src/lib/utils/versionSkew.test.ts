import { describe, it, expect } from "vitest";
import { esVersionDesactualizada, mensajeErrorUsuario } from "./versionSkew";

const ERROR_NEXT =
  'Server Action "7c2f3a4b0bf3f051860b624b36668dde660b3b375c" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';

describe("esVersionDesactualizada", () => {
  it("detecta el error de Server Action no encontrado", () => {
    expect(esVersionDesactualizada(new Error(ERROR_NEXT))).toBe(true);
  });

  it("detecta el mensaje corto de Next.js", () => {
    expect(esVersionDesactualizada(new Error("Failed to find Server Action"))).toBe(
      true,
    );
  });

  it("no marca otros errores", () => {
    expect(esVersionDesactualizada(new Error("No autorizado"))).toBe(false);
    expect(esVersionDesactualizada("texto")).toBe(false);
    expect(esVersionDesactualizada(null)).toBe(false);
  });
});

describe("mensajeErrorUsuario", () => {
  it("devuelve un mensaje accionable para version skew", () => {
    expect(mensajeErrorUsuario(new Error(ERROR_NEXT), "fallback")).toBe(
      "La aplicación se actualizó. Recarga la página e intenta de nuevo.",
    );
  });

  it("conserva el mensaje de otros errores", () => {
    expect(mensajeErrorUsuario(new Error("No autorizado"), "fallback")).toBe(
      "No autorizado",
    );
  });

  it("usa el mensaje por defecto si el error no es instancia de Error", () => {
    expect(mensajeErrorUsuario("otra cosa", "fallback")).toBe("fallback");
  });
});
