import { describe, expect, it } from "vitest";
import {
  construirPlantillaValoresCsv,
  construirPrevisualizacionValoresCsv,
  type AtributoValoresCsv,
} from "./atributosCsv";

const atributo: AtributoValoresCsv = {
  id: "a-color",
  nombre: "Color marco",
  valores: [
    { id: "v-negro", valor: "Negro" },
    { id: "v-oro", valor: "Oro" },
  ],
};

describe("construirPlantillaValoresCsv", () => {
  it("genera la plantilla solo con Valor", () => {
    const contenido = construirPlantillaValoresCsv();

    expect(contenido).toContain("sep=;");
    expect(contenido).toContain('"Valor"');
    expect(contenido).not.toContain("Valores");
  });
});

describe("construirPrevisualizacionValoresCsv", () => {
  it("procesa una columna Valor y separa nuevos de duplicados", () => {
    const csv = `sep=;
Valor
Plata
Negro
`;

    const preview = construirPrevisualizacionValoresCsv(atributo, csv);

    expect(preview.errores).toEqual([]);
    expect(preview.resumen.filas).toBe(2);
    expect(preview.resumen.valores_nuevos).toBe(1);
    expect(preview.resumen.valores_duplicados).toBe(1);
    expect(preview.valores_nuevos).toEqual(["Plata"]);
    expect(preview.payload).toEqual(["Plata"]);
  });

  it("rechaza el formato viejo con columna Valores", () => {
    const csv = `Valor;Valores
Plata;Rojo | Oro
`;

    const preview = construirPrevisualizacionValoresCsv(atributo, csv);

    expect(
      preview.errores.some((error) =>
        /solo la columna Valor/i.test(error.mensaje),
      ),
    ).toBe(true);
  });

  it("rechaza la columna Atributo", () => {
    const preview = construirPrevisualizacionValoresCsv(
      atributo,
      "Atributo;Valor\nColor marco;Plata\n",
    );

    expect(preview.errores.some((error) => /columna Atributo/i.test(error.mensaje))).toBe(
      true,
    );
  });

  it("reporta columnas faltantes y filas sin valor", () => {
    const sinColumnas = construirPrevisualizacionValoresCsv(
      atributo,
      "Otro\nNegro\n",
    );
    expect(
      sinColumnas.errores.some((error) => /Falta la columna Valor/i.test(error.mensaje)),
    ).toBe(true);

    const sinValores = construirPrevisualizacionValoresCsv(
      atributo,
      "Valor;Nota\n;x\n",
    );
    expect(sinValores.resumen.filas).toBe(1);
    expect(sinValores.errores[0]?.mensaje).toMatch(/no tiene valor/i);
  });

  it("deduplica por mayúsculas/acentos dentro del archivo", () => {
    const preview = construirPrevisualizacionValoresCsv(
      atributo,
      "Valor\nPLATA\nPlata\n",
    );

    expect(preview.resumen.valores_nuevos).toBe(1);
    expect(preview.resumen.valores_duplicados).toBe(1);
    expect(preview.payload).toEqual(["PLATA"]);
  });

  it("en una segunda corrida no genera payload", () => {
    const actualizado: AtributoValoresCsv = {
      ...atributo,
      valores: [...atributo.valores, { id: "v-plata", valor: "Plata" }],
    };

    const preview = construirPrevisualizacionValoresCsv(
      actualizado,
      "Valor\nPlata\n",
    );

    expect(preview.errores).toEqual([]);
    expect(preview.resumen.valores_nuevos).toBe(0);
    expect(preview.resumen.valores_duplicados).toBe(1);
    expect(preview.payload).toEqual([]);
  });
});
