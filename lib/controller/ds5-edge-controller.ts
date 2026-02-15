import { DS5Controller } from "./ds5-controller"
import { sleep, dec2hex32 } from "./utils"
import type { ControllerInfo } from "./utils"

export class DS5EdgeController extends DS5Controller {
  constructor(device: HIDDevice) {
    super(device)
    this.model = "DS5_Edge"
    this.finetuneMaxValue = 4095
  }

  async getInfo(): Promise<ControllerInfo> {
    const result = await this._getInfo(true)
    if (result.ok) {
      try {
        const barcodes = await this.getBarcode()
        const empty = Array(17).fill("\x00").join("")
        result.infoItems?.push({ key: "Left Module Barcode", value: barcodes[1] === empty ? "Unknown" : barcodes[1], cat: "fw" })
        result.infoItems?.push({ key: "Right Module Barcode", value: barcodes[0] === empty ? "Unknown" : barcodes[0], cat: "fw" })
      } catch { /* ignore */ }
    }
    return result
  }

  async flash(): Promise<{ success: boolean; message: string }> {
    await this.flashModules()
    return { success: true, message: "Changes saved successfully. If calibration is not permanent, check hardware mod wiring." }
  }

  async getBarcode(): Promise<[string, string]> {
    const td = new TextDecoder()
    await this.sendFeatureReport(0x80, [21, 34, 0]); await sleep(100)
    const rData = await this.receiveFeatureReport(0x81)
    const rBc = td.decode(rData.buffer.slice(21, 38))
    await this.sendFeatureReport(0x80, [21, 34, 1]); await sleep(100)
    const lData = await this.receiveFeatureReport(0x81)
    const lBc = td.decode(lData.buffer.slice(21, 38))
    return [lBc, rBc]
  }

  private async unlockModule(i: number): Promise<void> {
    await this.sendFeatureReport(0x80, [21, 6, i, 11])
    await sleep(200)
    if (!(await this.waitUntilWritten([21, 6, 2]))) throw new Error(`Cannot unlock module ${i}`)
  }

  private async lockModule(i: number): Promise<void> {
    await this.sendFeatureReport(0x80, [21, 4, i, 8])
    await sleep(200)
    if (!(await this.waitUntilWritten([21, 4, 2]))) throw new Error(`Cannot lock module ${i}`)
  }

  private async waitUntilWritten(expected: number[]): Promise<boolean> {
    for (let i = 0; i < 10; i++) {
      const data = await this.receiveFeatureReport(0x81)
      if (expected.every((b, idx) => data.getUint8(1 + idx) === b)) return true
      await sleep(50)
    }
    return false
  }

  private async flashModules(): Promise<void> {
    await sleep(100)
    await this.unlockModule(0)
    await this.unlockModule(1)
    await this.nvsUnlock(); await sleep(50)
    const data = await this.getInMemoryModuleData()
    if (data) { await sleep(50); await this.writeFinetuneData(data) }
    await sleep(100)
    await this.lockModule(0)
    await this.lockModule(1)
    await sleep(100)
    const lockRes = await this.nvsLock()
    if (!lockRes.ok) throw new Error("NVS lock failed")
    await sleep(250)
  }

  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> {
    try {
      await this.sendFeatureReport(0x82, [2, 1, 1])
      let data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010101) return { ok: false, error: new Error("End failed step 1") }
      await this.sendFeatureReport(0x82, [2, 1, 1])
      data = await this.receiveFeatureReport(0x83)
      const v = data.getUint32(0, false)
      if (v !== 0x83010103 && v !== 0x83010312) return { ok: false, error: new Error("End failed step 2") }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }

  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> {
    try {
      await this.sendFeatureReport(0x82, [2, 1, 2])
      let data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010201) return { ok: false, error: new Error("Range end failed step 1"), code: 4 }
      await this.sendFeatureReport(0x82, [2, 1, 2])
      data = await this.receiveFeatureReport(0x83)
      if (data.getUint32(0, false) !== 0x83010203) return { ok: false, error: new Error("Range end failed step 2"), code: 5 }
      return { ok: true }
    } catch (e) { return { ok: false, error: e as Error } }
  }
}
