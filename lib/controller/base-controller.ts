import { sleep, buf2hex, dec2hex } from "./utils"
import type { ControllerInfo, NvStatus, BatteryStatus, StickData } from "./utils"

export class BaseController {
  device: HIDDevice
  model: string
  finetuneMaxValue: number

  constructor(device: HIDDevice) {
    this.device = device
    this.model = "undefined"
    this.finetuneMaxValue = 0
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

  async getSerialNumber(): Promise<string> {
    throw new Error("getSerialNumber() must be implemented by subclass")
  }

  async getInfo(): Promise<ControllerInfo> {
    throw new Error("getInfo() must be implemented by subclass")
  }

  async flash(): Promise<{ success: boolean; message: string }> {
    throw new Error("flash() must be implemented by subclass")
  }

  async reset(): Promise<void> {
    throw new Error("reset() must be implemented by subclass")
  }

  async nvsLock(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("nvsLock() must be implemented by subclass")
  }

  async nvsUnlock(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("nvsUnlock() must be implemented by subclass")
  }

  async calibrateSticksBegin(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("must be implemented by subclass")
  }

  async calibrateSticksSample(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("must be implemented by subclass")
  }

  async calibrateSticksEnd(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("must be implemented by subclass")
  }

  async calibrateRangeBegin(): Promise<{ ok: boolean; error?: Error }> {
    throw new Error("must be implemented by subclass")
  }

  async calibrateRangeEnd(): Promise<{ ok: boolean; error?: Error; code?: number }> {
    throw new Error("must be implemented by subclass")
  }

  async queryNvStatus(): Promise<NvStatus> {
    throw new Error("must be implemented by subclass")
  }

  parseBatteryStatus(_data: DataView): BatteryStatus {
    throw new Error("must be implemented by subclass")
  }

  parseInput(data: DataView): { sticks: StickData; buttons: Record<string, boolean>; battery: BatteryStatus } {
    throw new Error("must be implemented by subclass")
  }

  getNumberOfSticks(): number { return 2 }
}
