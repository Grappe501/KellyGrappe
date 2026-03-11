import { registerDefaultRoles } from "./defaults/default.roles"
import { registerDefaultFeatures } from "./defaults/default.features"
import { registerDefaultMicroRooms } from "./defaults/default.microrooms"
import { registerDefaultBrands } from "./defaults/default.brands"

import { registerWarRoomTemplate } from "./dashboard/templates/warRoom.template"

let bootstrapped = false

export function bootstrapPlatform() {
  if (bootstrapped) return

  registerDefaultFeatures()
  registerDefaultRoles()
  registerDefaultMicroRooms()
  registerDefaultBrands()
  registerWarRoomTemplate()

  bootstrapped = true
}