import { DATOS_EMPRESA, NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import type { EntidadEmisora } from "@/lib/supabase/types";

export interface EscPosRaster {
  widthBytes: number;
  height: number;
  data: Uint8Array;
}

export function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export class EscPosBuilder {
  private buffer: number[] = [];

  reset(): this {
    this.buffer = [0x1b, 0x40];
    return this;
  }

  raw(bytes: Uint8Array): this {
    for (const b of bytes) this.buffer.push(b);
    return this;
  }

  raster(image: EscPosRaster): this {
    this.push(
      0x1d,
      0x76,
      0x30,
      0x00,
      image.widthBytes & 0xff,
      (image.widthBytes >> 8) & 0xff,
      image.height & 0xff,
      (image.height >> 8) & 0xff,
    );
    this.raw(image.data);
    return this;
  }

  text(text: string, wrap = true): this {
    this.push(...encodeText(text));
    if (wrap) this.push(0x0a);
    return this;
  }

  bold(on: boolean): this {
    this.push(0x1b, 0x45, on ? 1 : 0);
    return this;
  }

  underline(on: boolean): this {
    this.push(0x1b, 0x2d, on ? 1 : 0);
    return this;
  }

  align(alignment: "left" | "center" | "right"): this {
    const vals = { left: 0, center: 1, right: 2 };
    this.push(0x1b, 0x61, vals[alignment]);
    return this;
  }

  doubleHeight(on: boolean): this {
    this.push(0x1b, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.push(0x0a);
    return this;
  }

  cut(partial = false): this {
    this.push(0x1d, 0x56, partial ? 0x01 : 0x00);
    return this;
  }

  line(char = "-", count = 32): this {
    this.push(...encodeText(char.repeat(count)));
    this.push(0x0a);
    return this;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  private push(...bytes: number[]): void {
    for (const b of bytes) this.buffer.push(b);
  }
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el logo"));
    img.src = src;
  });
}

export async function imageToEscPosRaster(
  src: string,
  maxWidthDots = 192,
  maxHeightDots = 192,
  threshold = 160,
): Promise<EscPosRaster | null> {
  if (typeof document === "undefined" || !src) return null;

  const img = await cargarImagen(src);
  const anchoOriginal = img.naturalWidth || img.width || 256;
  const altoOriginal = img.naturalHeight || img.height || 256;
  const escala = Math.min(
    maxWidthDots / anchoOriginal,
    maxHeightDots / altoOriginal,
    1,
  );
  const width = Math.max(1, Math.floor(anchoOriginal * escala));
  const height = Math.max(1, Math.floor(altoOriginal * escala));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = Math.ceil(width / 8);
  const data = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luminancia =
        0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

      if (luminancia < threshold) {
        data[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return { widthBytes, height, data };
}

const THERMAL_PRINTER_SERVICE = "e7810a71-73ae-499d-8c15-faa9aef0c3f2";
const THERMAL_PRINTER_CHAR = "00001818-0000-1000-8000-00805f9b34fb";

export async function discoverPrinter(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth no está disponible en este navegador. Usa Chrome o Edge.");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [THERMAL_PRINTER_SERVICE] }],
    optionalServices: [THERMAL_PRINTER_CHAR],
  });

  return device;
}

export async function connectPrinter(device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic> {
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(THERMAL_PRINTER_SERVICE);
  const characteristic = await service.getCharacteristic(THERMAL_PRINTER_CHAR);
  return characteristic;
}

export async function sendToPrinter(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  chunkSize = 64,
): Promise<void> {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValueWithoutResponse(chunk);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export async function printTicket(
  characteristic: BluetoothRemoteGATTCharacteristic,
  buildFn: (b: EscPosBuilder) => void,
): Promise<void> {
  const builder = new EscPosBuilder();
  builder.reset();
  buildFn(builder);
  builder.feed(3).cut();
  await sendToPrinter(characteristic, builder.getBuffer());
}

export function buildTicketCommands(builder: EscPosBuilder, data: {
  numeroPedido: string;
  cliente: string;
  telefono?: string;
  fechaRecepcion: string;
  horaRecepcion: string;
  fechaEntrega: string;
  horaEntrega: string;
  metodoPago: string;
  subtotal: number;
  anticipo: number;
  total: number;
  lineas: {
    nombre: string;
    cantidad: number;
    importe: number;
    descuento?: number;
    atributos?: Record<string, string>;
  }[];
  emisor?: EntidadEmisora | null;
  logoRaster?: EscPosRaster | null;
}): void {
  const nombre = data.emisor?.nombre_comercial || NOMBRE_EMPRESA;
  const razonSocial = data.emisor?.razon_social || NOMBRE_EMPRESA;
  const rfc = data.emisor?.rfc || DATOS_EMPRESA.rfc;
  const telefonos = data.emisor?.telefonos || DATOS_EMPRESA.telefono;
  const correo = data.emisor?.email || DATOS_EMPRESA.correo;

  builder.align("center");

  if (data.logoRaster) {
    builder.raster(data.logoRaster).feed();
  }

  builder
    .doubleHeight(true)
    .bold(true)
    .text(nombre)
    .doubleHeight(false)
    .bold(false);

  if (razonSocial && razonSocial !== nombre) {
    builder.text(razonSocial);
  }

  builder
    .text(`RFC: ${rfc}`)
    .text(`Tel: ${telefonos}`)
    .text(`Correo: ${correo}`)
    .feed()
    .align("left")
    .line("=")
    .bold(true)
    .text(`Ticket: ${data.numeroPedido}`)
    .text(`Fecha: ${data.fechaRecepcion} ${data.horaRecepcion?.slice(0, 5)}`)
    .bold(false)
    .text(`Cliente: ${data.cliente}`);

  if (data.telefono) {
    builder.text(`Tel: ${data.telefono}`);
  }

  builder
    .text(`Entrega: ${data.fechaEntrega} ${data.horaEntrega?.slice(0, 5)}`)
    .feed()
    .line("-")
    .bold(true)
    .text("Producto           Cant    Importe")
    .bold(false)
    .line("-");

  for (const linea of data.lineas) {
    builder.text(linea.nombre);
    if (linea.atributos) {
      for (const [k, v] of Object.entries(linea.atributos)) {
        builder.text(`  ${k}: ${v}`);
      }
    }
    builder.text(`                    ${String(linea.cantidad).padEnd(6)} ${`$${linea.importe.toFixed(2)}`.padStart(10)}`);
    if (linea.descuento && linea.descuento > 0) {
      builder.text(`  Desc. unitario: -$${linea.descuento.toFixed(2)}`);
    }
  }

  builder
    .line("-")
    .text(`Subtotal:                    $${data.subtotal.toFixed(2)}`)
    .text(`Anticipo:                    $${data.anticipo.toFixed(2)}`)
    .bold(true)
    .doubleHeight(true)
    .text(`TOTAL: $${data.total.toFixed(2)}`)
    .doubleHeight(false)
    .bold(false)
    .text(`Pago: ${data.metodoPago}`)
    .feed()
    .line("=")
    .align("center")
    .text("Gracias por su compra!")
    .text("Indispensable presentar ticket.")
    .text("No hay devoluciones.")
    .text("L mite 30 dias para recoger.")
    .feed();
}

export function isBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}
