import { BaseController } from "./base-controller"
import { sleep, buf2hex, dec2hex, dec2hex32, dec2hex8, formatMacFromView, reverseStr, ds5Color } from "./utils"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData } from "./utils"

export class DS5Controller extends BaseController {
  constructor(device: HIDDevice) {
    super(device)
    this.model = "DS5"
    this.finetuneMaxValue = 65535
  }

  async getSerialNumber(): Promise<string> {
    return await this.getSystemInfo(1, 19, 17)
  }

  async getSystemInfo(base: number, num: number, length: number, decode = true): Promise<string> {
    await this.sendFeatureReport(128, [base, num])
    const data = await this.receiveFeatureReport(129)
    if (data.getUint8(1) !== base || data.getUint8(2) !== num || data.getUint8(3) !== 2) return "error"
    if (decode) return new TextDecoder().decode(data.buffer.slice(4, 4 + length))
    return buf2hex(data.buffer.slice(4, 4 + length))
  }

  async getBdAddr(): Promise<string> {
    await this.sendFeatureReport(0x80, [9, 2])
    const data = await this.receiveFeatureReport(0x81)
    return formatMacFromView(data, 4)
  }

  async getInfo(): Promise<ControllerInfo> {
    return this._getInfo(false)
  }

  protected async _getInfo(isEdge: boolean): Promise<ControllerInfo> {
    try {
      const view = await this.receiveFeatureReport(0x20)
      const cmd = view.getUint8(0)
      if (cmd !== 0x20 || view.buffer.byteLength !== 64) return { ok: false, error: new Error("Invalid response") }

      const buildDate = new TextDecoder().decode(view.buffer.slice(1, 12))
      const buildTime = new TextDecoder().decode(view.buffer.slice(12, 20))
      const fwtype = view.getUint16(20, true)
      const swseries = view.getUint16(22, true)
      const hwinfo = view.getUint32(24, true)
      const fwversion = view.getUint32(28, true)
      const updversion = view.getUint16(44, true)
      const unk = view.getUint8(46)
      const fwversion1 = view.getUint32(48, true)
      const fwversion2 = view.getUint32(52, true)
      const fwversion3 = view.getUint32(56, true)

      const serialNumber = await this.getSystemInfo(1, 19, 17)
      const color = ds5Color(serialNumber)
      const infoItems = [
        { key: "Serial Number", value: serialNumber, cat: "hw", copyable: true },
        { key: "MCU Unique ID", value: await this.getSystemInfo(1, 9, 9, false), cat: "hw", isExtra: true, copyable: true },
        { key: "PCBA ID", value: reverseStr(await this.getSystemInfo(1, 17, 14)), cat: "hw", isExtra: true },
        { key: "Battery Barcode", value: await this.getSystemInfo(1, 24, 23), cat: "hw", isExtra: true, copyable: true },
        { key: "VCM Left Barcode", value: await this.getSystemInfo(1, 26, 16), cat: "hw", isExtra: true, copyable: true },
        { key: "VCM Right Barcode", value: await this.getSystemInfo(1, 28, 16), cat: "hw", isExtra: true, copyable: true },
        { key: "Color", value: color, cat: "hw", copyable: true },
        ...(!isEdge ? [{ key: "Board Model", value: this.hwToBoardModel(hwinfo), cat: "hw", copyable: true }] : []),
        { key: "FW Build Date", value: `${buildDate} ${buildTime}`, cat: "fw" },
        { key: "FW Type", value: `0x${dec2hex(fwtype)}`, cat: "fw", isExtra: true },
        { key: "FW Series", value: `0x${dec2hex(swseries)}`, cat: "fw", isExtra: true },
        { key: "HW Model", value: `0x${dec2hex32(hwinfo)}`, cat: "hw", isExtra: true },
        { key: "FW Version", value: `0x${dec2hex32(fwversion)}`, cat: "fw", isExtra: true },
        { key: "FW Update", value: `0x${dec2hex(updversion)}`, cat: "fw", isExtra: true },
        { key: "FW Update Info", value: `0x${dec2hex8(unk)}`, cat: "fw", isExtra: true },
        { key: "SBL FW Version", value: `0x${dec2hex32(fwversion1)}`, cat: "fw", isExtra: true },
        { key: "Venom FW Version", value: `0x${dec2hex32(fwversion2)}`, cat: "fw", isExtra: true },
        { key: "Spider FW Version", value: `0x${dec2hex32(fwversion3)}`, cat: "fw", isExtra: true },
        { key: "Touchpad ID", value: await this.getSystemInfo(5, 2, 8, false), cat: "hw", isExtra: true, copyable: true },
        { key: "Touchpad FW Version", value: await this.getSystemInfo(5, 4, 8, false), cat: "fw", isExtra: true },
      ]

      let disableBits = 0
      if (buildDate.includes("2020") || buildDate.includes("2021")) disableBits |= 2

      const nv = await this.queryNvStatus()
      const bdAddr = await this.getBdAddr()
      infoItems.push({ key: "Bluetooth Address", value: bdAddr, cat: "hw", isExtra: true })
      const pendingReboot = nv?.status === "pending_reboot"

      return { ok: true, infoItems, nv, disable_bits: disableBits, pending_reboot: pendingReboot }
    } catch (error) {
      return { ok: false, error: error as Error, disable_bits: 1 }
    }
  }

  async flash(): Promise<{ success: boolean; message: string }> {
    await this.nvsUnlock()
    const lockRes = await this.nvsLock()
    if (!lockRes.ok) throw new Error("NVS lock failed")
    return { success: true, message: "Changes saved successfully" }
  }

  async reset(): Promise<void> {
    try { await this.sendFeatureReport(0x80, [1, 1]) } catch { /* ignore */ }
  }

  async nvsLock(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x80, [3, 1])
      await this.receiveFeatureReport(0x81)
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async nvsUnlock(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x80, [3, 2, 101, 50, 64, 12])
      await this.receiveFeatureReport(0x81)
      return { ok: true }
    } catch (e) {
      await sleep(500)
      return { ok: false, error: e as Error }
    }
  }

  async calibrateSticksBegin(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x82, [1, 1, 1])
      const data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010101) return { ok: false, error: new Error("Begin failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateSticksSample(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x82, [3, 1, 1])
      const data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010101) return { ok: false, error: new Error("Sample failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x82, [2, 1, 1])
      const data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010102) return { ok: false, error: new Error("End failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateRangeBegin(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x82, [1, 1, 2])
      const data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010201) return { ok: false, error: new Error("Range begin failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> {
    try {
      await this.sendFeatureReport(0x82, [2, 1, 2])
      const data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010202) return { ok: false, error: new Error("Range end failed"), code: 3 }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async queryNvStatus(): Promise<NvStatus> {
    try {
      await this.sendFeatureReport(0x80, [8, 2])
      const data = await this.receiveFeatureReport(0x81)
      const code = data.getUint8(3)
      switch (code) {
        case 0: return { device: "ds5", status: "unlocked", locked: false, code }
        case 1: return { device: "ds5", status: "locked", locked: true, code }
        case 2: return { device: "ds5", status: "pending_reboot", locked: null, code }
        default: return { device: "ds5", status: "unknown", locked: null, code, raw: data.getUint32(0, true) }
      }
    } catch (e) { return { device: "ds5", status: "error", locked: null, error: e as Error } }
  }

  parseBatteryStatus(data: DataView): BatteryStatus {
    const rawBat = data.getUint8(52)
    const batData = rawBat & 0x0f
    const batStatus = (rawBat >> 4) & 0x0f
    const cableConnected = (batStatus & 0x01) !== 0
    let chargeLevel = Math.min(batData * 10 + 5, 100)
    const isCharging = cableConnected && batData < 10
    return { charge_level: chargeLevel, cable_connected: cableConnected, is_charging: isCharging, is_error: false }
  }

  parseInput(data: DataView): { sticks: StickData; buttons: Record<string, boolean>; battery: BatteryStatus } {
    const lx = (data.getUint8(0) / 255) * 2 - 1
    const ly = (data.getUint8(1) / 255) * 2 - 1
    const rx = (data.getUint8(2) / 255) * 2 - 1
    const ry = (data.getUint8(3) / 255) * 2 - 1
    const l2 = data.getUint8(4)
    const r2 = data.getUint8(5)
    const btn7 = data.getUint8(7)
    const btn8 = data.getUint8(8)
    const btn9 = data.getUint8(9)
    const dpad = btn7 & 0x0f
    const buttons: Record<string, boolean> = {
      cross: !!(btn7 & 0x20), circle: !!(btn7 & 0x40), square: !!(btn7 & 0x10), triangle: !!(btn7 & 0x80),
      l1: !!(btn8 & 0x01), r1: !!(btn8 & 0x02), l2: l2 > 10, r2: r2 > 10,
      create: !!(btn8 & 0x10), options: !!(btn8 & 0x20), l3: !!(btn8 & 0x40), r3: !!(btn8 & 0x80),
      ps: !!(btn9 & 0x01), touchpad: !!(btn9 & 0x02), mute: !!(btn9 & 0x04),
      up: dpad === 0 || dpad === 1 || dpad === 7, right: dpad >= 1 && dpad <= 3,
      down: dpad >= 3 && dpad <= 5, left: dpad >= 5 && dpad <= 7,
    }
    return { sticks: { lx, ly, rx, ry }, buttons, battery: this.parseBatteryStatus(data) }
  }

  async getInMemoryModuleData(): Promise<number[] | null> {
    await this.sendFeatureReport(0x80, [12, 4])
    await sleep(100)
    const data = await this.receiveFeatureReport(0x81)
    const cmd = data.getUint8(0)
    const p1 = data.getUint8(1), p2 = data.getUint8(2), p3 = data.getUint8(3)
    if (cmd !== 129 || p1 !== 12 || (p2 !== 2 && p2 !== 4) || p3 !== 2) return null
    return Array.from({ length: 12 }, (_, i) => data.getUint16(4 + i * 2, true))
  }

  async writeFinetuneData(dataArr: number[]): Promise<void> {
    const pkg = dataArr.reduce<number[]>((acc, val) => acc.concat([val & 0xff, val >> 8]), [12, 1])
    await this.sendFeatureReport(0x80, pkg)
  }

  hwToBoardModel(hwinfo: number): string {
    const board = (hwinfo >> 8) & 0xff
    if (board >= 0x03 && board <= 0x07) return "CFI-ZCT1" // Standard DS5
    if (board >= 0x08 && board <= 0x0c) return "CFI-ZCT1 (Rev B)"
    return `Board 0x${dec2hex8(board)}`
  }
}
