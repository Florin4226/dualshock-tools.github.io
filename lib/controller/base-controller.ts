import { sleep, buf2hex, dec2hex } from "./utils"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData } from "./utils"

export class BaseController {
  device: HIDDevice
  model: string
  finetuneMaxValue: number
  currentOutputState: Record<string, number>

  constructor(device: HIDDevice) {
    this.device = device
    this.model = "undefined"
    this.finetuneMaxValue = 0
    this.currentOutputState = {}
  }

  getModel(): string { return this.model }

  allocReq(id: number, data: number[]): Uint8Array {
    const fr = (this.device as any).collections?.[0]?.featureReports
    const reportItem = fr?.find((e: any) => e.reportId === id)?.items?.[0]
    const maxLen = reportItem?.reportCount || data.length
    const out = new Uint8Array(maxLen)
    out.set(data.slice(0, Math.min(data.length, maxLen)))
    return out
  }

  async sendFeatureReport(reportId: number, data: number[] | Uint8Array): Promise<void> {
    const buf = Array.isArray(data) ? this.allocReq(reportId, data) : data
    await this.device.sendFeatureReport(reportId, buf)
  }

  async receiveFeatureReport(reportId: number): Promise<DataView> {
    return await this.device.receiveFeatureReport(reportId)
  }

  async close(): Promise<void> {
    if (this.device?.opened) await this.device.close()
  }

  // Abstract methods
  async getSerialNumber(): Promise<string> { throw new Error("not implemented") }
  async getInfo(): Promise<ControllerInfo> { throw new Error("not implemented") }
  async flash(): Promise<{ success: boolean; message: string }> { throw new Error("not implemented") }
  async reset(): Promise<void> { throw new Error("not implemented") }
  async nvsLock(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async nvsUnlock(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async calibrateSticksBegin(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async calibrateSticksSample(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async calibrateRangeBegin(): Promise<{ ok: boolean; error?: Error }> { throw new Error("not implemented") }
  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> { throw new Error("not implemented") }
  async queryNvStatus(): Promise<NvStatus> { throw new Error("not implemented") }
  parseBatteryStatus(_data: DataView): BatteryStatus { throw new Error("not implemented") }
  parseInput(data: DataView): { sticks: StickData; buttons: Record<string, boolean>; battery: BatteryStatus; l2Analog: number; r2Analog: number } { throw new Error("not implemented") }
  getNumberOfSticks(): number { return 2 }

  // Output methods with default no-op implementations
  async setVibration(_heavyLeft: number, _lightRight: number): Promise<void> {}
  async setAdaptiveTrigger(_left: { mode: string; start: number; end: number; force: number }, _right: { mode: string; start: number; end: number; force: number }): Promise<void> {}
  async setLightbarColor(_r: number, _g: number, _b: number): Promise<void> {}
  async setPlayerIndicator(_pattern: number): Promise<void> {}
  async setMuteLed(_state: number): Promise<void> {}
  async setSpeakerTone(_output: string): Promise<void> {}
  async resetSpeakerSettings(): Promise<void> {}
  async resetLights(): Promise<void> {}
  async initializeOutputState(): Promise<void> {}

  getSupportedTests(): string[] {
    return ["usb", "buttons", "sticks"]
  }
}
