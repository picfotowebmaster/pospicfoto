import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "pedido-fotos";
const LOTE = 100;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function listarArchivos(prefijo = "") {
  const archivos = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefijo, { limit: 1000, offset });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const ruta = prefijo ? `${prefijo}/${item.name}` : item.name;
      if (item.id === null) {
        archivos.push(...(await listarArchivos(ruta)));
      } else {
        archivos.push(ruta);
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return archivos;
}

const archivos = await listarArchivos();
console.log(`Archivos encontrados en ${BUCKET}: ${archivos.length}`);

for (let i = 0; i < archivos.length; i += LOTE) {
  const lote = archivos.slice(i, i + LOTE);
  const { error } = await supabase.storage.from(BUCKET).remove(lote);
  if (error) {
    console.error("Error al eliminar lote:", error.message);
    process.exit(1);
  }
  console.log(`Eliminados ${Math.min(i + LOTE, archivos.length)}/${archivos.length}`);
}

console.log("Bucket vacío.");
