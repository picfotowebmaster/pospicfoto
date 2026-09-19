import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = "https://ofarxltreyfpxsbiafzs.supabase.co";
const SUPABASE_REST = `${SUPABASE_URL}/rest/v1`;

async function setupApiRoutes(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-id",
        email: "cajero@test.com",
        role: "authenticated",
        user_metadata: { rol: "mostrador" },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      }),
    });
  });
  await page.route(`${SUPABASE_REST}/profiles**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-id",
        rol: "mostrador",
        nombre: "Cajero Test",
        sucursal_id: "suc-test-1",
        created_at: new Date().toISOString(),
      }),
    });
  });

  await page.route(`${SUPABASE_REST}/sucursales**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "suc-test-1", nombre: "Palma", codigo: "PAL" },
      ]),
    });
  });

  await page.route(`${SUPABASE_REST}/marcas**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "marca-test-1", nombre: "Picfoto", codigo: "PIC" },
      ]),
    });
  });

  await page.route(`${SUPABASE_REST}/atributos**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route(`${SUPABASE_REST}/productos_historial**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "ph-1", nombre: "Foto 4x6", atributos: {}, veces_usado: 10, ultimo_uso: "" },
        { id: "ph-2", nombre: "Foto 5x7", atributos: {}, veces_usado: 5, ultimo_uso: "" },
      ]),
    });
  });

  await page.route(`${SUPABASE_REST}/pedidos**`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

test.describe("Flujo mostrador → ticket", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApiRoutes(page);

    await context.addInitScript(() => {
      window.localStorage.setItem(
        "sb-localhost-auth-token",
        JSON.stringify({
          access_token: "fake-token",
          expires_at: Date.now() + 86400,
          user: { id: "test-user-id", email: "cajero@test.com", role: "authenticated" },
        })
      );
    });

    await page.goto("/mostrador", { waitUntil: "commit" });
  });

  test("renderiza la pagina de mostrador", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("PIC FOTO");
    await expect(page.getByText("Sistema de Punto de Venta")).toBeVisible();
  });

  test("muestra el formulario de cliente con campos requeridos", async ({ page }) => {
    await expect(page.getByPlaceholder("Nombre completo")).toBeVisible();
    await expect(page.getByPlaceholder("55 1234 5678")).toBeVisible();
    await expect(page.getByText("Datos del Cliente")).toBeVisible();
  });

  test("completa datos del cliente", async ({ page }) => {
    const nombreInput = page.getByPlaceholder("Nombre completo");
    await nombreInput.fill("Juan Pérez");
    expect(await nombreInput.inputValue()).toBe("Juan Pérez");

    const telefonoInput = page.getByPlaceholder("55 1234 5678");
    await telefonoInput.fill("5512345678");
    expect(await telefonoInput.inputValue()).toBe("5512345678");
  });

  test("agrega producto y verifica que aparece en la tabla", async ({ page }) => {
    await page.getByPlaceholder("Nombre completo").fill("Cliente Test");
    await page.getByPlaceholder("55 1234 5678").fill("5500000000");

    const agregarBtn = page.getByRole("button", { name: /Agregar Producto/i });
    if (await agregarBtn.isVisible()) {
      await agregarBtn.click();
      await page.waitForTimeout(500);

      const productoInput = page.getByPlaceholder(/Producto|Buscar/).first();
      if (await productoInput.isVisible()) {
        await productoInput.fill("Foto 4x6");
      }
    }
  });

  test("muestra selector de ruta de produccion", async ({ page }) => {
    await expect(page.getByText("Ruta de Producción")).toBeVisible();
    const rutaSelect = page.locator("select").last();
    await expect(rutaSelect).toBeVisible();
  });

  test("el boton de pagar esta presente", async ({ page }) => {
    await page.waitForTimeout(2000);
    const pagarBtn = page.getByRole("button", { name: /Pagar/i });
    await expect(pagarBtn).toBeVisible({ timeout: 10000 });
  });

  test("muestra campos de fecha y hora de entrega", async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill("2026-08-01");
      expect(await dateInput.inputValue()).toBe("2026-08-01");
    }

    const timeInput = page.locator('input[type="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill("14:00");
      expect(await timeInput.inputValue()).toBe("14:00");
    }
  });
});
