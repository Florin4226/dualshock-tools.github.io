import { BaseController } from "./base-controller"
import { DS4Controller } from "./ds4-controller"
import { DS5Controller } from "./ds5-controller"
import { DS5EdgeController } from "./ds5-edge-controller"
import { SUPPORTED_DEVICES, getDeviceName, getDeviceModel } from "./utils"

export function createControllerInstance(device: HIDDevice): BaseController {
  switch (device.productId) {
    case 0x05c4: case 0x09cc: return new DS4Controller(device)
    case 0x0ce6: return new DS5Controller(device)
    case 0x0df2: return new DS5EdgeController(device)
    default: throw new Error(`Unsupported device: ${device.vendorId}:${device.productId}`)
  }
}

export { SUPPORTED_DEVICES, getDeviceName, getDeviceModel }
