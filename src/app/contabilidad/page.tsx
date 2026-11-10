import { redirect } from "next/navigation";
import { facturacionHabilitada } from "@/lib/config/features";

export default function ContabilidadPage() {
  redirect(
    facturacionHabilitada() ? "/contabilidad/pedidos" : "/contabilidad/reportes",
  );
}
