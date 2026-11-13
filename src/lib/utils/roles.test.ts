import { describe, expect, it } from "vitest";
import {
  ROLES_PRODUCCION_SWITCH,
  rolesSwitchDisponibles,
  resolverRolEfectivo,
  etiquetaVolver,
  puedeVerRoleSwitcher,
  puedeVerReportesCompletos,
  esRolProduccion,
  puedeVerIngresos,
  rutaInicioPorRol,
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

describe("puedeVerReportesCompletos", () => {
  it("solo admin, superadmin y contador ven el reporte completo", () => {
    expect(puedeVerReportesCompletos("admin")).toBe(true);
    expect(puedeVerReportesCompletos("superadmin")).toBe(true);
    expect(puedeVerReportesCompletos("contador")).toBe(true);
    expect(puedeVerReportesCompletos("mostrador")).toBe(false);
    expect(puedeVerReportesCompletos("diseno")).toBe(false);
    expect(puedeVerReportesCompletos(null)).toBe(false);
  });
});

describe("esRolProduccion", () => {
  it("identifica roles de producción y taller", () => {
    expect(esRolProduccion("diseno")).toBe(true);
    expect(esRolProduccion("impresion")).toBe(true);
    expect(esRolProduccion("taller")).toBe(true);
    expect(esRolProduccion("corte")).toBe(true);
  });

  it("excluye administración, mostrador y contador", () => {
    expect(esRolProduccion("admin")).toBe(false);
    expect(esRolProduccion("superadmin")).toBe(false);
    expect(esRolProduccion("mostrador")).toBe(false);
    expect(esRolProduccion("contador")).toBe(false);
    expect(esRolProduccion(null)).toBe(false);
  });
});

describe("puedeVerIngresos", () => {
  it("solo admin, superadmin y mostrador ven ingresos", () => {
    expect(puedeVerIngresos("admin")).toBe(true);
    expect(puedeVerIngresos("superadmin")).toBe(true);
    expect(puedeVerIngresos("mostrador")).toBe(true);
  });

  it("producción y contador no ven ingresos", () => {
    expect(puedeVerIngresos("diseno")).toBe(false);
    expect(puedeVerIngresos("taller")).toBe(false);
    expect(puedeVerIngresos("contador")).toBe(false);
    expect(puedeVerIngresos(null)).toBe(false);
  });
});

describe("rutaInicioPorRol", () => {
  it("envía cada rol a su módulo", () => {
    expect(rutaInicioPorRol("admin")).toBe("/admin");
    expect(rutaInicioPorRol("superadmin")).toBe("/admin");
    expect(rutaInicioPorRol("mostrador")).toBe("/mostrador");
    expect(rutaInicioPorRol("contador")).toBe("/contabilidad");
    expect(rutaInicioPorRol("diseno")).toBe("/produccion/kanban");
    expect(rutaInicioPorRol("taller")).toBe("/produccion/kanban");
    expect(rutaInicioPorRol("corte")).toBe("/produccion/kanban");
  });

  it("sin rol cae en mostrador", () => {
    expect(rutaInicioPorRol(null)).toBe("/mostrador");
  });
});
