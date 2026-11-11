import { describe, expect, it } from "vitest";
import {
  ROLES_PRODUCCION_SWITCH,
  rolesSwitchDisponibles,
  resolverRolEfectivo,
  etiquetaVolver,
  puedeVerRoleSwitcher,
} from "./roles";

describe("rolesSwitchDisponibles", () => {
  it("taller solo puede ver roles de producción", () => {
    expect(rolesSwitchDisponibles("taller")).toEqual([
      ...ROLES_PRODUCCION_SWITCH,
    ]);
  });

  it("admin puede ver todos los roles del selector", () => {
    const roles = rolesSwitchDisponibles("admin");
    expect(roles).toContain("mostrador");
    expect(roles).toContain("taller");
    expect(roles).toContain("contador");
    expect(roles).toContain("diseno");
  });

  it("otros roles no pueden usar el selector", () => {
    expect(rolesSwitchDisponibles("mostrador")).toEqual([]);
    expect(rolesSwitchDisponibles("contador")).toEqual([]);
    expect(rolesSwitchDisponibles(null)).toEqual([]);
  });
});

describe("resolverRolEfectivo", () => {
  it("acepta un override permitido para taller", () => {
    expect(resolverRolEfectivo("taller", "diseno")).toBe("diseno");
  });

  it("ignora overrides no permitidos para taller", () => {
    expect(resolverRolEfectivo("taller", "mostrador")).toBe("taller");
    expect(resolverRolEfectivo("taller", "contador")).toBe("taller");
    expect(resolverRolEfectivo("taller", "admin")).toBe("taller");
  });

  it("admin puede usar roles de mostrador y contador", () => {
    expect(resolverRolEfectivo("admin", "mostrador")).toBe("mostrador");
    expect(resolverRolEfectivo("admin", "contador")).toBe("contador");
  });

  it("sin rol real devuelve null", () => {
    expect(resolverRolEfectivo(null, "diseno")).toBeNull();
  });
});

describe("puedeVerRoleSwitcher", () => {
  it("solo admin, superadmin y taller", () => {
    expect(puedeVerRoleSwitcher("admin")).toBe(true);
    expect(puedeVerRoleSwitcher("superadmin")).toBe(true);
    expect(puedeVerRoleSwitcher("taller")).toBe(true);
    expect(puedeVerRoleSwitcher("mostrador")).toBe(false);
    expect(puedeVerRoleSwitcher(null)).toBe(false);
  });
});

describe("etiquetaVolver", () => {
  it("usa el rol real para la etiqueta", () => {
    expect(etiquetaVolver("taller")).toBe("Volver a Taller");
    expect(etiquetaVolver("admin")).toBe("Volver a Admin");
  });
});
