import { listarAutorizadoresCancelacion } from "./autorizadoresCancelacion";
import {
  enviarCancelacionVenta,
  type EnviarCancelacionParams,
} from "./email";

export type DatosNotificacionCancelacion = Omit<EnviarCancelacionParams, "to">;

export async function notificarCancelacionAdministradores(
  datos: DatosNotificacionCancelacion,
): Promise<void> {
  try {
    const administradores = await listarAutorizadoresCancelacion();
    if (administradores.length === 0) return;

    const resultados = await Promise.allSettled(
      administradores.map((administrador) =>
        enviarCancelacionVenta({ to: administrador.email, ...datos }),
      ),
    );

    resultados.forEach((resultado, index) => {
      if (resultado.status === "rejected") {
        console.error(
          `No se pudo enviar la notificación de cancelación a ${administradores[index].email}:`,
          resultado.reason,
        );
      }
    });
  } catch (err) {
    console.error(
      "No se pudo notificar la cancelación a los administradores:",
      err instanceof Error ? err.message : err,
    );
  }
}
