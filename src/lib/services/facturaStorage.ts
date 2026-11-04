import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function subirFacturaAStorage(
  admin: AdminClient,
  uuid: string,
  xml: string,
  pdfBase64: string | undefined,
  prefijo = "",
): Promise<{ xmlUrl: string | null; pdfUrl: string | null }> {
  let xmlUrl: string | null = null;
  let pdfUrl: string | null = null;

  try {
    await admin.storage.createBucket("facturas", { public: true });
  } catch {
    // el bucket ya existe o no hay permisos; se intenta subir de todas formas
  }

  const base = `${prefijo}${uuid}`;

  try {
    await admin.storage
      .from("facturas")
      .upload(`${base}.xml`, new TextEncoder().encode(xml), {
        contentType: "application/xml",
        upsert: true,
      });
    xmlUrl = admin.storage.from("facturas").getPublicUrl(`${base}.xml`).data
      .publicUrl;
  } catch {
    xmlUrl = null;
  }

  if (pdfBase64) {
    try {
      const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, "base64"));
      await admin.storage
        .from("facturas")
        .upload(`${base}.pdf`, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      pdfUrl = admin.storage.from("facturas").getPublicUrl(`${base}.pdf`).data
        .publicUrl;
    } catch {
      pdfUrl = null;
    }
  }

  return { xmlUrl, pdfUrl };
}
