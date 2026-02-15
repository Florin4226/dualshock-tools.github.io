"use strict"

export async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms))
}

export function buf2hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join("")
}

export function dec2hex(i: number): string {
  return (i + 0x10000).toString(16).substr(-4).toUpperCase()
}

export function dec2hex32(i: number): string {
  return (i + 0x100000000).toString(16).substr(-8).toUpperCase()
}

export function dec2hex8(i: number): string {
  return (i + 0x100).toString(16).substr(-2).toUpperCase()
}

export function formatMacFromView(view: DataView, startIndex: number): string {
  const bytes: string[] = []
  for (let i = 0; i < 6; i++) {
    const idx = startIndex + (5 - i)
    bytes.push(dec2hex8(view.getUint8(idx)))
  }
  return bytes.join(":")
}

export function reverseStr(s: string): string {
  return s.split("").reverse().join("")
}

export const CIRCULARITY_DATA_SIZE = 48

export function calculateCircularityError(data: number[]): number {
  const sumSquaredDeviations = data.reduce((acc, val) =>
    val > 0.2 ? acc + Math.pow(val - 1, 2) : acc, 0)
  const validDataCount = data.filter(val => val > 0.2).length
  return validDataCount > 0 ? Math.sqrt(sumSquaredDeviations / validDataCount) * 100 : 0
}

export interface InfoItem {
  key: string
  value: string
  cat: string
  severity?: string
  addInfoIcon?: string
  copyable?: boolean
  isExtra?: boolean
}

export interface NvStatus {
  device: string
  status: string
  locked: boolean | null
  code?: number
  mode?: string
  raw?: number
  error?: Error
}

export interface ControllerInfo {
  ok: boolean
  infoItems?: InfoItem[]
  nv?: NvStatus
  disable_bits?: number
  pending_reboot?: boolean
  rare?: boolean
  error?: Error
}

export interface BatteryStatus {
  charge_level: number
  cable_connected: boolean
  is_charging: boolean
  is_error: boolean
}

export interface StickData {
  lx: number
  ly: number
  rx: number
  ry: number
}

export interface ButtonState {
  [key: string]: boolean
}

export function ds5Color(serialNumber: string): string {
  const colorMap: Record<string, string> = {
    "00": "White", "01": "Midnight Black", "02": "Cosmic Red",
    "03": "Nova Pink", "04": "Galactic Purple", "05": "Starlight Blue",
    "06": "Grey Camouflage", "07": "Volcanic Red", "08": "Sterling Silver",
    "09": "Cobalt Blue", "10": "Chroma Teal", "11": "Chroma Indigo",
    "12": "Chroma Pearl", "30": "30th Anniversary",
    "Z1": "God of War Ragnarok", "Z2": "Spider-Man 2",
    "Z3": "Astro Bot", "Z4": "Fortnite", "Z6": "The Last of Us",
    "ZB": "Icon Blue Limited Edition",
  }
  const colorCode = serialNumber.slice(4, 6)
  return colorMap[colorCode] || "Unknown"
}

// WebHID type augmentation
export interface HIDDeviceExt extends HIDDevice {
  oninputreport: ((event: HIDInputReportEvent) => void) | null
}

// Supported device filters for WebHID
export const SUPPORTED_DEVICES = [
  { vendorId: 0x054c, productId: 0x05c4 }, // DS4 v1
  { vendorId: 0x054c, productId: 0x09cc }, // DS4 v2
  { vendorId: 0x054c, productId: 0x0ce6 }, // DS5
  { vendorId: 0x054c, productId: 0x0df2 }, // DS5 Edge
]

export function getDeviceName(productId: number): string {
  switch (productId) {
    case 0x05c4: return "Sony DualShock 4 V1"
    case 0x09cc: return "Sony DualShock 4 V2"
    case 0x0ce6: return "Sony DualSense"
    case 0x0df2: return "Sony DualSense Edge"
    default: return "Unknown Device"
  }
}

export function getDeviceModel(productId: number): string {
  switch (productId) {
    case 0x05c4: case 0x09cc: return "DS4"
    case 0x0ce6: return "DS5"
    case 0x0df2: return "DS5_Edge"
    default: return "Unknown"
  }
}
