import { BaseController } from "./base-controller"
import { sleep, buf2hex, dec2hex, dec2hex32, dec2hex8, formatMacFromView, reverseStr, ds5Color } from "./utils"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData } from "./utils"

// DS5 Adaptive Trigger Effect Modes
const TRIGGER_MODE = { OFF: 0x00, RESISTANCE: 0x01, TRIGGER: 0x02, AUTO_TRIGGER: 0x06 }
const FLAG0 = { R_VIB: 0x01, L_VIB: 0x02, L_TRIG: 0x04, R_TRIG: 0x08, HP_VOL: 0x10, SP_VOL: 0x20, MIC_VOL: 0x40, AUDIO: 0x80 }
const FLAG1 = { MUTE_LED: 0x01, LIGHTBAR: 0x04, PLAYER_IND: 0x10 }

function packDS5Output(st: Record<string, number>): ArrayBuffer {
  const buf = new ArrayBuffer(47)
  const v = new DataView(buf)
  v.setUint8(0, st.f0 || 0)
  v.setUint8(1, st.f1 || 0)
  v.setUint8(2, st.vibR || 0)
  v.setUint8(3, st.vibL || 0)
  v.setUint8(4, st.hpVol || 0)
  v.setUint8(5, st.spVol || 0)
  v.setUint8(6, st.micVol || 0)
  v.setUint8(7, st.audioCtl || 0)
  v.setUint8(8, st.muteLed || 0)
  v.setUint8(10, st.atRMode || 0)
  v.setUint8(11, st.atRP0 || 0)
  v.setUint8(12, st.atRP1 || 0)
  v.setUint8(13, st.atRP2 || 0)
  v.setUint8(21, st.atLMode || 0)
  v.setUint8(22, st.atLP0 || 0)
  v.setUint8(23, st.atLP1 || 0)
  v.setUint8(24, st.atLP2 || 0)
  v.setUint8(43, st.playerInd || 0)
  v.setUint8(44, st.ledR || 0)
  v.setUint8(45, st.ledG || 0)
  v.setUint8(46, st.ledB || 0)
  return buf
}

export class DS5Controller extends BaseController {
  constructor(device: HIDDevice) {
    super(device)
    this.model = "DS5"
    this.finetuneMaxValue = 65535
    this.currentOutputState = { f0: 0, f1: 0b1111_0111, vibR: 0, vibL: 0, hpVol: 0, spVol: 0, micVol: 0, audioCtl: 0, muteLed: 0, atRMode: 0, atRP0: 0, atRP1: 0, atRP2: 0, atLMode: 0, atLP0: 0, atLP1: 0, atLP2: 0, playerInd: 0, ledR: 0, ledG: 0, ledB: 255 }
  }

  private async sendOut(reason = ""): Promise<void> {
    const buf = packDS5Output(this.currentOutputState)
    await this.device.sendReport(0x02, new Uint8Array(buf))
  }

  async initializeOutputState(): Promise<void> {
    try { await this.sendOut("init") } catch { /* ignore */ }
  }

  async setVibration(heavyLeft: number, lightRight: number): Promise<void> {
    this.currentOutputState.vibL = Math.max(0, Math.min(255, heavyLeft))
    this.currentOutputState.vibR = Math.max(0, Math.min(255, lightRight))
    this.currentOutputState.f0 |= FLAG0.L_VIB | FLAG0.R_VIB
    await this.sendOut("vibration")
    this.currentOutputState.f0 &= ~(FLAG0.L_VIB | FLAG0.R_VIB)
  }

  async setAdaptiveTrigger(left: { mode: string; start: number; end: number; force: number }, right: { mode: string; start: number; end: number; force: number }): Promise<void> {
    const modeMap: Record<string, number> = { off: TRIGGER_MODE.OFF, single: TRIGGER_MODE.TRIGGER, auto: TRIGGER_MODE.AUTO_TRIGGER, resistance: TRIGGER_MODE.RESISTANCE }
    this.currentOutputState.atLMode = modeMap[left.mode] || 0
    this.currentOutputState.atLP0 = left.start
    this.currentOutputState.atLP1 = left.end
    this.currentOutputState.atLP2 = left.force
    this.currentOutputState.atRMode = modeMap[right.mode] || 0
    this.currentOutputState.atRP0 = right.start
    this.currentOutputState.atRP1 = right.end
    this.currentOutputState.atRP2 = right.force
    this.currentOutputState.f0 |= FLAG0.L_TRIG | FLAG0.R_TRIG
    await this.sendOut("adaptive trigger")
    this.currentOutputState.f0 &= ~(FLAG0.L_TRIG | FLAG0.R_TRIG)
  }

  async setLightbarColor(r: number, g: number, b: number): Promise<void> {
    this.currentOutputState.ledR = Math.max(0, Math.min(255, r))
    this.currentOutputState.ledG = Math.max(0, Math.min(255, g))
    this.currentOutputState.ledB = Math.max(0, Math.min(255, b))
    this.currentOutputState.f1 |= FLAG1.LIGHTBAR
    await this.sendOut("lightbar")
    this.currentOutputState.f1 &= ~FLAG1.LIGHTBAR
  }

  async setPlayerIndicator(pattern: number): Promise<void> {
    this.currentOutputState.playerInd = Math.max(0, Math.min(31, pattern))
    this.currentOutputState.f1 |= FLAG1.PLAYER_IND
    await this.sendOut("player indicator")
    this.currentOutputState.f1 &= ~FLAG1.PLAYER_IND
  }

  async setMuteLed(state: number): Promise<void> {
    this.currentOutputState.muteLed = Math.max(0, Math.min(2, state))
    this.currentOutputState.f1 |= FLAG1.MUTE_LED
    await this.sendOut("mute led")
    this.currentOutputState.f1 &= ~FLAG1.MUTE_LED
  }

  async setSpeakerTone(output = "speaker"): Promise<void> {
    this.currentOutputState.spVol = 85
    this.currentOutputState.hpVol = 55
    this.currentOutputState.f0 |= FLAG0.HP_VOL | FLAG0.SP_VOL | FLAG0.AUDIO
    await this.sendOut("audio")
    this.currentOutputState.f0 &= ~(FLAG0.HP_VOL | FLAG0.SP_VOL | FLAG0.AUDIO)
    if (output === "headphones") {
      await this.sendFeatureReport(128, [6, 4, 0, 0, 0, 0, 4, 0, 6])
      await this.sendFeatureReport(128, [6, 2, 1, 1, 0])
    } else {
      await this.sendFeatureReport(128, [6, 4, 0, 0, 8])
      await this.sendFeatureReport(128, [6, 2, 1, 1, 0])
    }
  }

  async resetSpeakerSettings(): Promise<void> {
    await this.sendFeatureReport(128, [6, 2, 0, 1, 0])
    this.currentOutputState.spVol = 0
    this.currentOutputState.f0 |= FLAG0.SP_VOL | FLAG0.AUDIO
    await this.sendOut("stop audio")
    this.currentOutputState.f0 &= ~(FLAG0.SP_VOL | FLAG0.AUDIO)
  }

  async resetLights(): Promise<void> {
    await this.setLightbarColor(0, 0, 0)
    await this.setPlayerIndicator(0)
    await this.setMuteLed(0)
  }

  getSupportedTests(): string[] {
    return ["usb", "buttons", "sticks", "adaptive_triggers", "haptic", "lights", "speaker", "headphone", "microphone"]
  }

  // ---- Serial / Info ----
  async getSerialNumber(): Promise<string> { return await this.getSystemInfo(1, 19, 17) }

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

  async getInfo(): Promise<ControllerInfo> { return this._getInfo(false) }

  protected async _getInfo(isEdge: boolean): Promise<ControllerInfo> {
    try {
      const view = await this.receiveFeatureReport(0x20)
      if (view.getUint8(0) !== 0x20 || view.buffer.byteLength !== 64) return { ok: false, error: new Error("Invalid response") }

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
      return { ok: true, infoItems, nv, disable_bits: disableBits, pending_reboot: nv?.status === "pending_reboot" }
    } catch (error) { return { ok: false, error: error as Error, disable_bits: 1 } }
  }

  // ---- Calibration ----
  async flash(): Promise<{ success: boolean; message: string }> {
    await this.nvsUnlock(); const r = await this.nvsLock(); if (!r.ok) throw new Error("NVS lock failed")
    return { success: true, message: "Changes saved successfully" }
  }
  async reset(): Promise<void> { try { await this.sendFeatureReport(0x80, [1, 1]) } catch { /* */ } }
  async nvsLock(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x80, [3, 1]); await this.receiveFeatureReport(0x81); return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }
  async nvsUnlock(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x80, [3, 2, 101, 50, 64, 12]); await this.receiveFeatureReport(0x81); return { ok: true } } catch (e) { await sleep(500); return { ok: false, error: e as Error } } }

  async calibrateSticksBegin(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x82, [1, 1, 1]); const d = await this.receiveFeatureReport(0x83); if (d.getUint32(0, false) !== 0x83010101) return { ok: false, error: new Error("Begin failed") }; return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }
  async calibrateSticksSample(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x82, [3, 1, 1]); const d = await this.receiveFeatureReport(0x83); if (d.getUint32(0, false) !== 0x83010101) return { ok: false, error: new Error("Sample failed") }; return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }
  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x82, [2, 1, 1]); const d = await this.receiveFeatureReport(0x83); if (d.getUint32(0, false) !== 0x83010102) return { ok: false, error: new Error("End failed") }; return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }
  async calibrateRangeBegin(): Promise<{ ok: boolean; error?: Error }> { try { await this.sendFeatureReport(0x82, [1, 1, 2]); const d = await this.receiveFeatureReport(0x83); if (d.getUint32(0, false) !== 0x83010201) return { ok: false, error: new Error("Range begin failed") }; return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }
  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> { try { await this.sendFeatureReport(0x82, [2, 1, 2]); const d = await this.receiveFeatureReport(0x83); if (d.getUint32(0, false) !== 0x83010202) return { ok: false, error: new Error("Range end failed"), code: 3 }; return { ok: true } } catch (e) { return { ok: false, error: e as Error } } }

  async queryNvStatus(): Promise<NvStatus> {
    try {
      await this.sendFeatureReport(0x80, [3, 3])
      const d = await this.receiveFeatureReport(0x81)
      const ret = d.getUint32(1, false)
      if (ret === 0x15010100) return { device: "ds5", status: "pending_reboot", locked: null, code: 4 }
      if (ret === 0x03030201) return { device: "ds5", status: "locked", locked: true, code: 1 }
      if (ret === 0x03030200) return { device: "ds5", status: "unlocked", locked: false, code: 0 }
      return { device: "ds5", status: "unknown", locked: null, code: ret }
    } catch (e) { return { device: "ds5", status: "error", locked: null, error: e as Error } }
  }

  parseBatteryStatus(data: DataView): BatteryStatus {
    const bat = data.getUint8(52)
    const charge = bat & 0x0f, status = bat >> 4
    const cableConnected = status >= 1 && status <= 2
    const chargeLevel = Math.min(charge * 10 + 5, 100)
    return { charge_level: status === 2 ? 100 : chargeLevel, cable_connected: cableConnected, is_charging: status === 1, is_error: status >= 11 }
  }

  parseInput(data: DataView): { sticks: StickData; buttons: Record<string, boolean>; battery: BatteryStatus; l2Analog: number; r2Analog: number } {
    const lx = (data.getUint8(0) / 255) * 2 - 1, ly = (data.getUint8(1) / 255) * 2 - 1
    const rx = (data.getUint8(2) / 255) * 2 - 1, ry = (data.getUint8(3) / 255) * 2 - 1
    const l2 = data.getUint8(4), r2 = data.getUint8(5)
    const b7 = data.getUint8(7), b8 = data.getUint8(8), b9 = data.getUint8(9)
    const dpad = b7 & 0x0f
    return {
      sticks: { lx, ly, rx, ry },
      l2Analog: l2, r2Analog: r2,
      buttons: {
        cross: !!(b7 & 0x20), circle: !!(b7 & 0x40), square: !!(b7 & 0x10), triangle: !!(b7 & 0x80),
        l1: !!(b8 & 0x01), r1: !!(b8 & 0x02), l2: l2 > 10, r2: r2 > 10,
        create: !!(b8 & 0x10), options: !!(b8 & 0x20), l3: !!(b8 & 0x40), r3: !!(b8 & 0x80),
        ps: !!(b9 & 0x01), touchpad: !!(b9 & 0x02), mute: !!(b9 & 0x04),
        up: dpad === 0 || dpad === 1 || dpad === 7, right: dpad >= 1 && dpad <= 3,
        down: dpad >= 3 && dpad <= 5, left: dpad >= 5 && dpad <= 7,
      },
      battery: this.parseBatteryStatus(data),
    }
  }

  // ---- Fine-tune ----
  async getInMemoryModuleData(): Promise<number[] | null> {
    await this.sendFeatureReport(0x80, [12, 2]); await sleep(100)
    const d = await this.receiveFeatureReport(0x81)
    if (d.getUint8(0) !== 129 || d.getUint8(1) !== 12 || (d.getUint8(2) !== 2 && d.getUint8(2) !== 4) || d.getUint8(3) !== 2) return null
    return Array.from({ length: 12 }, (_, i) => d.getUint16(4 + i * 2, true))
  }

  async writeFinetuneData(dataArr: number[]): Promise<void> {
    const pkg = dataArr.reduce<number[]>((acc, val) => acc.concat([val & 0xff, val >> 8]), [12, 1])
    await this.sendFeatureReport(0x80, pkg)
  }

  hwToBoardModel(hwinfo: number): string {
    const a = (hwinfo >> 8) & 0xff
    if (a === 0x03) return "BDM-010"
    if (a === 0x04) return "BDM-020"
    if (a === 0x05) return "BDM-030"
    if (a === 0x06) return "BDM-040"
    if (a === 0x07 || a === 0x08) return "BDM-050"
    if (a === 0x11) return "BDM-060M"
    if (a === 0x13) return "BDM-060X"
    return `Board 0x${dec2hex8(a)}`
  }
}
