import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";

const LF = "\n";
const ESC = "\x1b";
const GS = "\x1d";

export function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export class EscPosBuilder {
  private buffer: number[] = [];

  reset(): this {
    this.buffer = [0x1b, 0x40];
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
  lineas: { nombre: string; cantidad: number; importe: number; atributos?: Record<string, string> }[];
}): void {
  builder
    .align("center")
    .doubleHeight(true)
    .bold(true)
    .text(NOMBRE_EMPRESA)
    .doubleHeight(false)
    .bold(false)
    .text("RFC: PPH180924PK9")
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
  }

  builder
    .line("-")
    .text(`Subtotal:                    $${data.subtotal.toFixed(2)}`)
    .text(`Anticipo:                    $${data.anticipo.toFixed(2)}`)
    .bold(true)
    .text(`TOTAL:                       $${data.total.toFixed(2)}`)
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
