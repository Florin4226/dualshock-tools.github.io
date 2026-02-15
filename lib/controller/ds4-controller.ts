import { BaseController } from "./base-controller"
import { sleep, dec2hex, formatMacFromView } from "./utils"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData } from "./utils"

export class DS4Controller extends BaseController {
  constructor(device: HIDDevice) {
    super(device)
    this.model = "DS4"
  }

  async getSerialNumber(): Promise<string> {
    return await this.getBdAddr()
  }

  async getBdAddr(): Promise<string> {
    const view = await this.receiveFeatureReport(0x12)
    return formatMacFromView(view, 1)
  }

  async getInfo(): Promise<ControllerInfo> {
    try {
      const view = await this.receiveFeatureReport(0xa3)
      const cmd = view.getUint8(0)
      let isClone = false
      let deviceType = "unknown"

      if (cmd !== 0xa3 || view.buffer.byteLength < 49) {
        if (view.buffer.byteLength !== 49) { deviceType = "clone"; isClone = true }
      }

      const k1 = new TextDecoder().decode(view.buffer.slice(1, 0x10)).replace(/\0/g, "")
      const k2 = new TextDecoder().decode(view.buffer.slice(0x10, 0x20)).replace(/\0/g, "")
      const hwVerMinor = view.getUint16(0x23, true)
      const hwVerMajor = view.getUint16(0x21, true)
      const swVerMajor = view.getUint32(0x25, true)
      const swVerMinor = view.getUint16(0x29, true)

      if (!isClone) {
        try { await this.receiveFeatureReport(0x81); deviceType = "original" }
        catch { isClone = true; deviceType = "clone" }
      }

      const hwVersion = `${dec2hex(hwVerMajor)}:${dec2hex(hwVerMinor)}`
      const swVersion = `${dec2hex(swVerMajor)}:${dec2hex(swVerMinor)}`
      const boardModel = this.hwToBoardModel(hwVerMinor)
      const bdAddr = await this.getBdAddr()
      const infoItems = [
        { key: "Build Date", value: `${k1} ${k2}`, cat: "fw" },
        { key: "HW Version", value: hwVersion, cat: "hw" },
        { key: "SW Version", value: swVersion, cat: "fw" },
        { key: "Device Type", value: deviceType, cat: "hw", severity: isClone ? "danger" : undefined },
        ...(!isClone ? [
          { key: "Board Model", value: boardModel, cat: "hw", copyable: true },
          { key: "Bluetooth Address", value: bdAddr, cat: "hw" },
        ] : []),
      ]
      const nv = await this.queryNvStatus()
      return { ok: true, infoItems, nv, disable_bits: isClone ? 1 : 0 }
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
    try { await this.sendFeatureReport(0xa0, [4, 1, 0]) } catch { /* ignore */ }
  }

  async nvsLock(): Promise<{ ok: boolean; error?: Error }> {
    try { await this.sendFeatureReport(0xa0, [10, 1, 0]); return { ok: true } }
    catch (e) { return { ok: false, error: e as Error } }
  }

  async nvsUnlock(): Promise<{ ok: boolean; error?: Error }> {
    try { await this.sendFeatureReport(0xa0, [10, 2, 0x3e, 0x71, 0x7f, 0x89]); return { ok: true } }
    catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateSticksBegin(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x90, [1, 1, 1]); await sleep(200)
      const data = await this.receiveFeatureReport(0x91)
      const data2 = await this.receiveFeatureReport(0x92)
      if (data.getUint32(0, false) !== 0x91010101 || data2.getUint32(0, false) !== 0x920101ff) {
        return { ok: false, error: new Error("Calibration begin failed") }
      }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateSticksSample(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x90, [3, 1, 1]); await sleep(200)
      const data = await this.receiveFeatureReport(0x91)
      const data2 = await this.receiveFeatureReport(0x92)
      if (data.getUint32(0, false) !== 0x91010101 || data2.getUint32(0, false) !== 0x920101ff)
        return { ok: false, error: new Error("Sample failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x90, [2, 1, 1]); await sleep(200)
      const data = await this.receiveFeatureReport(0x91)
      const data2 = await this.receiveFeatureReport(0x92)
      if (data.getUint32(0, false) !== 0x91010102 || data2.getUint32(0, false) !== 0x92010101)
        return { ok: false, error: new Error("Calibration end failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateRangeBegin(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x90, [1, 1, 2]); await sleep(200)
      const data = await this.receiveFeatureReport(0x91)
      const data2 = await this.receiveFeatureReport(0x92)
      if (data.getUint32(0, false) !== 0x91010201 || data2.getUint32(0, false) !== 0x920102ff)
        return { ok: false, error: new Error("Range begin failed") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> {
    try {
      await this.sendFeatureReport(0x90, [2, 1, 2]); await sleep(200)
      const data = await this.receiveFeatureReport(0x91)
      const data2 = await this.receiveFeatureReport(0x92)
      if (data.getUint32(0, false) !== 0x91010202 || data2.getUint32(0, false) !== 0x92010201)
        return { ok: false, error: new Error("Range end failed"), code: 3 }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async queryNvStatus(): Promise<NvStatus> {
    try {
      await this.sendFeatureReport(0x08, [0xff, 0, 12])
      const data = await this.receiveFeatureReport(0x11)
      const ret = data.getUint8(1)
      switch (ret) {
        case 1: return { device: "ds4", status: "locked", locked: true, code: ret, mode: "temporary" }
        case 0: return { device: "ds4", status: "unlocked", locked: false, code: ret, mode: "permanent" }
        default: return { device: "ds4", status: "unknown", locked: null, code: ret }
      }
    } catch (e) { return { device: "ds4", status: "error", locked: null, code: 2, error: e as Error } }
  }

  parseBatteryStatus(data: DataView): BatteryStatus {
    const bat = data.getUint8(29)
    const batData = bat & 0x0f
    const batStatus = (bat >> 4) & 1
    const cableConnected = batStatus === 1
    let chargeLevel = 0, isCharging = false, isError = false
    if (cableConnected) {
      if (batData < 10) { chargeLevel = Math.min(batData * 10 + 5, 100); isCharging = true }
      else if (batData === 10) { chargeLevel = 100; isCharging = true }
      else if (batData === 11) { chargeLevel = 100 }
      else { isError = true }
    } else { chargeLevel = batData < 10 ? batData * 10 + 5 : 100 }
    return { charge_level: chargeLevel, cable_connected: cableConnected, is_charging: isCharging, is_error: isError }
  }

  parseInput(data: DataView): { sticks: StickData; buttons: Record<string, boolean>; battery: BatteryStatus } {
    const lx = (data.getUint8(0) / 255) * 2 - 1
    const ly = (data.getUint8(1) / 255) * 2 - 1
    const rx = (data.getUint8(2) / 255) * 2 - 1
    const ry = (data.getUint8(3) / 255) * 2 - 1
    const btn4 = data.getUint8(4)
    const btn5 = data.getUint8(5)
    const btn6 = data.getUint8(6)
    const dpad = btn4 & 0x0f
    const buttons: Record<string, boolean> = {
      cross: !!(btn4 & 0x20), circle: !!(btn4 & 0x40), square: !!(btn4 & 0x10), triangle: !!(btn4 & 0x80),
      l1: !!(btn5 & 0x01), r1: !!(btn5 & 0x02), l2: !!(btn5 & 0x04), r2: !!(btn5 & 0x08),
      share: !!(btn5 & 0x10), options: !!(btn5 & 0x20), l3: !!(btn5 & 0x40), r3: !!(btn5 & 0x80),
      ps: !!(btn6 & 0x01), touchpad: !!(btn6 & 0x02),
      up: dpad === 0 || dpad === 1 || dpad === 7, right: dpad >= 1 && dpad <= 3,
      down: dpad >= 3 && dpad <= 5, left: dpad >= 5 && dpad <= 7,
    }
    const l2Value = data.getUint8(7)
    const r2Value = data.getUint8(8)
    buttons.l2 = buttons.l2 || l2Value > 10
    buttons.r2 = buttons.r2 || r2Value > 10
    return { sticks: { lx, ly, rx, ry }, buttons, battery: this.parseBatteryStatus(data) }
  }

  hwToBoardModel(hwVer: number): string {
    const a = hwVer >> 8
    if (a === 0x31) return "JDM-001"
    if (a === 0x43) return "JDM-011"
    if (a === 0x54) return "JDM-030"
    if (a >= 0x64 && a <= 0x74) return "JDM-040"
    if ((a > 0x80 && a < 0x84) || a === 0x93) return "JDM-020"
    if (a === 0xa4 || a === 0x90 || a === 0xa0) return "JDM-050"
    if (a === 0xb0) return "JDM-055 (Scuf?)"
    if (a === 0xb4) return "JDM-055"
    return "Unknown"
  }
}
