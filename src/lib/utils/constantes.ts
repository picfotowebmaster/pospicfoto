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
] as const;

export const RUTAS_PRODUCCION = [
  { label: "R1 - Impresión", value: "R1" as const, desc: "Diseño → Impresión → Taller final" },
  { label: "R2 - Marcos", value: "R2" as const, desc: "Taller de Marcos → Montaje" },
  { label: "R3 - Books Directo", value: "R3" as const, desc: "Directo a Taller de Books" },
  { label: "R4 - Laminado", value: "R4" as const, desc: "Taller de Laminado → Montaje" },
];
