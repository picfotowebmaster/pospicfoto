# Project Context — POS PIC FOTO

## Proyecto y propósito
POS interno para PIC FOTO: punto de venta, producción y entrega de fotografía,
impresión, molduras y marcos. Cubre mostrador, producción, tickets, facturación
y reportes contables.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind.
- Supabase: Postgres, Auth, Storage, RPC/PostgREST.
- Resend (correo), PWA offline con IndexedDB, Vitest + Playwright.
- Despliegue web interno; datos reales de operación.

## Fase actual
Producción interna con datos reales. En curso: optimización del consumo de
egress de Supabase sin degradar la operación de mostrador.

## Restricciones clave
- Límite de egress del plan Supabase. Un catálogo completo pesa ~0.8 MB por
  sincronización (medido: precios 367 KB / 3,713 filas; valores de atributo
  265 KB / 1,764 filas).
- Mostrador debe seguir funcionando offline y con respuesta rápida.
- No romper venta, ticket, facturación ni reportes contables.
- Multi-marca (PIC/FRX) y multi-sucursal; filtrar por marca y sucursal.
- Operación en México: montos en MXN, zona horaria -06:00.

## Qué significa "done"
- Egress diario reducido de forma medible sin degradar UX ni integridad de
  ventas/facturación.
- Catálogo con caché local e ingesta incremental (watermark + tombstones).
- Consultas con columnas mínimas, paginación y límites explícitos.
- Reporte diario de consumo de egress con desglose por pantalla/disparador.
