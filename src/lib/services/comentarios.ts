import { supabase } from "../supabase/client";
import type { PedidoComentario, TipoComentario } from "../supabase/types";

const BUCKET_FOTOS = "pedido-fotos";

export async function subirFotoPedido(file: File, pedidoId: string): Promise<string> {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : "jpg";
  const path = `${pedidoId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchComentarios(
  pedidoId: string,
): Promise<PedidoComentario[]> {
  const { data, error } = await supabase
    .from("pedido_comentarios")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PedidoComentario[];
}

export async function crearComentario(params: {
  pedidoId: string;
  autorId: string;
  texto: string;
  tipo?: TipoComentario;
  fotoUrl?: string | null;
}): Promise<PedidoComentario> {
  const { data, error } = await supabase
    .from("pedido_comentarios")
    .insert({
      pedido_id: params.pedidoId,
      autor_id: params.autorId,
      texto: params.texto,
      tipo: params.tipo ?? "comentario",
      foto_url: params.fotoUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PedidoComentario;
}

export async function eliminarComentario(id: string): Promise<void> {
  const { error } = await supabase
    .from("pedido_comentarios")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
