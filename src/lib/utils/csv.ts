export type CeldaCSV = string | number | boolean | null | undefined;

export function filasACsv(filas: CeldaCSV[][]): string {
  return filas
    .map((fila) =>
      fila
        .map((celda) => {
          const s = celda == null ? "" : String(celda);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}

export function descargarCSV(nombreArchivo: string, filas: CeldaCSV[][]): void {
  const contenido = filasACsv(filas);
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
