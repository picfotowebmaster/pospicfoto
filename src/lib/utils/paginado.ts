const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const filas: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const pagina = data ?? [];
    filas.push(...pagina);
    if (pagina.length < PAGE_SIZE) break;
  }

  return filas;
}
