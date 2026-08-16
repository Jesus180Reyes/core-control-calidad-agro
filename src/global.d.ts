/**
 * Tipos de la Web Serial API.
 *
 * Se declaran localmente porque `lib.dom.d.ts` todavía no los incluye y el
 * paquete `@types/w3c-web-serial` no está instalado en el proyecto (antes se
 * importaba de ahí, lo que dejaba `navigator.serial` y `SerialPort` como `any`).
 *
 * Referencia: https://wicg.github.io/serial/
 */

type SerialParityType = 'none' | 'even' | 'odd'
type SerialFlowControlType = 'none' | 'hardware'

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
  bluetoothServiceClassId?: number | string
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: SerialParityType
  bufferSize?: number
  flowControl?: SerialFlowControlType
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean
  requestToSend?: boolean
  break?: boolean
}

interface SerialInputSignals {
  dataCarrierDetect: boolean
  clearToSend: boolean
  ringIndicator: boolean
  dataSetReady: boolean
}

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  readonly connected: boolean

  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  forget(): Promise<void>
  getInfo(): SerialPortInfo
  getSignals(): Promise<SerialInputSignals>
  setSignals(signals?: SerialOutputSignals): Promise<void>

  onconnect: ((this: SerialPort, ev: Event) => unknown) | null
  ondisconnect: ((this: SerialPort, ev: Event) => unknown) | null
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
  bluetoothServiceClassId?: number | string
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
  allowedBluetoothServiceClassIds?: (number | string)[]
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>

  onconnect: ((this: Serial, ev: Event) => unknown) | null
  ondisconnect: ((this: Serial, ev: Event) => unknown) | null
}

interface Navigator {
  readonly serial: Serial
}

interface WorkerNavigator {
  readonly serial: Serial
}
