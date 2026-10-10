import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoAtributo } from "./CampoAtributo";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

const atributo: Atributo = { id: "a1", nombre: "Pasta Color", activo: true };

const valores: AtributoValor[] = [
  { id: "v1", atributo_id: "a1", valor: "Amarillo" },
  { id: "v2", atributo_id: "a1", valor: "Azul" },
];

describe("CampoAtributo (select)", () => {
  it("renderiza las opciones y notifica el cambio", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CampoAtributo
        atributo={atributo}
        valor=""
        valores={valores}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(screen.getByRole("option", { name: "Amarillo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Azul" })).toBeInTheDocument();

    await user.selectOptions(select, "Azul");
    expect(onChange).toHaveBeenCalledWith("Azul");
  });

  it("mantiene un valor actual que no está en la lista", () => {
    render(
      <CampoAtributo
        atributo={atributo}
        valor="Magenta"
        valores={valores}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("option", { name: "Magenta" })).toBeInTheDocument();
  });
});
