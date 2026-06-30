export const DATOS_EMPRESA = {
  nombre: "PIC PHOTO",
  rfc: "PPH180924PK9",
  direccion: 'REPÚBLICA DE CUBA #81 LOCAL "A" Y "C", CENTRO HISTÓRICO, CDMX.',
};

export const POLITICAS = [
  "1. Se realizará lo indicado por el cliente.",
  "2. 70% de anticipo.",
  "3. No hay devoluciones.",
  "4. Indispensable presentar ticket.",
  "5. Límite de 30 días para recoger el trabajo.",
];

export const ANTICIPO_POR_DEFECTO = 70;

export const ANTICIPO_OPCIONES = [
  { label: "Sin anticipo", value: 0 },
  { label: "70% de anticipo", value: 70 },
  { label: "100% (Total)", value: 100 },
];

export const METODOS_PAGO = [
  { label: "Efectivo", value: "Efectivo" as const },
  { label: "Tarjeta", value: "Tarjeta" as const },
  { label: "Transferencia", value: "Transferencia" as const },
];

export const ESTADOS_PEDIDO = [
  { label: "Pendiente", value: "pendiente" as const, color: "bg-yellow-500" },
  { label: "En Taller", value: "en_taller" as const, color: "bg-blue-500" },
  { label: "En Corte", value: "en_corte" as const, color: "bg-purple-500" },
  { label: "Listo", value: "listo" as const, color: "bg-green-500" },
  { label: "Entregado", value: "entregado" as const, color: "bg-gray-500" },
];

export const AREAS_PRODUCCION_VISIBLES = [
  "mostrador",
  "diseno",
  "impresion",
  "laminado",
  "montaje",
  "books",
  "bastidores",
  "marcos",
  "listo",
] as const;

export const RUTAS_PRODUCCION = [
  { label: "R1 - Impresión", value: "R1" as const, desc: "Diseño → Impresión → Taller final" },
  { label: "R2 - Marcos", value: "R2" as const, desc: "Taller de Marcos → Montaje" },
  { label: "R3 - Books Directo", value: "R3" as const, desc: "Directo a Taller de Books" },
  { label: "R4 - Laminado", value: "R4" as const, desc: "Taller de Laminado → Montaje" },
];

export const AREAS_PRODUCCION_DATA = [
  { id: "mostrador", nombre: "Ventas / Mostrador", color: "bg-yellow-500", orden: 0 },
  { id: "diseno", nombre: "Diseño", color: "bg-indigo-500", orden: 1 },
  { id: "impresion", nombre: "Impresión", color: "bg-blue-500", orden: 2 },
  { id: "laminado", nombre: "Taller de Laminado", color: "bg-teal-500", orden: 3 },
  { id: "montaje", nombre: "Taller de Montaje", color: "bg-emerald-500", orden: 4 },
  { id: "books", nombre: "Taller de Books", color: "bg-violet-500", orden: 4 },
  { id: "bastidores", nombre: "Taller de Bastidores", color: "bg-rose-500", orden: 4 },
  { id: "marcos", nombre: "Taller de Marcos", color: "bg-amber-500", orden: 1 },
  { id: "listo", nombre: "Listo para Entrega", color: "bg-green-500", orden: 99 },
  { id: "entregado", nombre: "Entregado", color: "bg-gray-500", orden: 100 },
];

export const WORKFLOW_ROUTES_DATA = [
  { id: "seed-r1-1", from_area: "mostrador", to_area: "diseno", ruta: "R1", multiple: false },
  { id: "seed-r1-2", from_area: "diseno", to_area: "impresion", ruta: "R1", multiple: false },
  { id: "seed-r1-3", from_area: "impresion", to_area: "laminado", ruta: "R1", multiple: true },
  { id: "seed-r1-4", from_area: "impresion", to_area: "montaje", ruta: "R1", multiple: true },
  { id: "seed-r1-5", from_area: "impresion", to_area: "books", ruta: "R1", multiple: true },
  { id: "seed-r1-6", from_area: "impresion", to_area: "bastidores", ruta: "R1", multiple: true },
  { id: "seed-r2-1", from_area: "mostrador", to_area: "marcos", ruta: "R2", multiple: false },
  { id: "seed-r2-2", from_area: "marcos", to_area: "montaje", ruta: "R2", multiple: false },
  { id: "seed-r3-1", from_area: "mostrador", to_area: "books", ruta: "R3", multiple: false },
  { id: "seed-r4-1", from_area: "mostrador", to_area: "laminado", ruta: "R4", multiple: false },
  { id: "seed-r4-2", from_area: "laminado", to_area: "montaje", ruta: "R4", multiple: false },
  { id: "seed-final-r1", from_area: "listo", to_area: "entregado", ruta: "R1", multiple: false },
  { id: "seed-final-r2", from_area: "listo", to_area: "entregado", ruta: "R2", multiple: false },
  { id: "seed-final-r3", from_area: "listo", to_area: "entregado", ruta: "R3", multiple: false },
  { id: "seed-final-r4", from_area: "listo", to_area: "entregado", ruta: "R4", multiple: false },
];
