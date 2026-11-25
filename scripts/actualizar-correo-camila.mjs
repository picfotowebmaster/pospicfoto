import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const USER_ID = "087f57ba-0af2-46fb-ac31-703cc0cebb4b";
const EMAIL_ANTERIOR = "camila@picfoto.mx";
const EMAIL_NUEVO = "camilatorres@picfoto.mx";

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: antes, error: errorAntes } =
  await supabase.auth.admin.getUserById(USER_ID);

if (errorAntes || !antes?.user) {
  console.error("No se encontró el usuario:", errorAntes?.message ?? "sin datos");
  process.exit(1);
}

const { data: perfil } = await supabase
  .from("profiles")
  .select("id, nombre, rol")
  .eq("id", USER_ID)
  .maybeSingle();

console.log("Usuario actual:", {
  id: antes.user.id,
  email: antes.user.email,
  confirmado: Boolean(antes.user.email_confirmed_at),
});
console.log("Perfil:", perfil);

const emailActual = (antes.user.email ?? "").toLowerCase();

if (emailActual === EMAIL_NUEVO) {
  console.log("El correo ya está actualizado. No se hizo nada.");
  process.exit(0);
}

if (emailActual !== EMAIL_ANTERIOR) {
  console.error(
    `El usuario no tiene el correo esperado (${EMAIL_ANTERIOR}). Se encontró: ${antes.user.email}. Abortando.`,
  );
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
  email: EMAIL_NUEVO,
  email_confirm: true,
});

if (error) {
  console.error("No se pudo actualizar el correo:", error.message);
  process.exit(1);
}

console.log("Correo actualizado:", {
  id: data.user.id,
  email: data.user.email,
  confirmado: Boolean(data.user.email_confirmed_at),
});

const { data: despues, error: errorDespues } =
  await supabase.auth.admin.getUserById(USER_ID);

if (errorDespues || !despues?.user) {
  console.error(
    "No se pudo verificar el cambio:",
    errorDespues?.message ?? "sin datos",
  );
  process.exit(1);
}

console.log("Verificación:", {
  id: despues.user.id,
  email: despues.user.email,
  confirmado: Boolean(despues.user.email_confirmed_at),
});
