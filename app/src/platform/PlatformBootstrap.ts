/*
PlatformBootstrap

Initializes the entire platform registry system.

This runs once when the application starts and ensures that:

cards
dashboards
roles
microrooms
brands
features

are registered before any dashboard renders.
*/

import { registerDefaultRoles } from "./defaults/default.roles";
import { registerDefaultFeatures } from "./defaults/default.features";
import { registerDefaultMicroRooms } from "./defaults/default.microrooms";
import { registerDefaultBrands } from "./defaults/default.brands";

import { registerWarRoomTemplate } from "@/dashboards/templates/warRoom.template";

/*
Cards self-register when their registry file is imported
*/
import "@/cards/registry";

let bootstrapped = false;

export function bootstrapPlatform() {

  if (bootstrapped) return;

  console.log("Bootstrapping platform...");

  /* core features */
  registerDefaultFeatures();

  /* roles */
  registerDefaultRoles();

  /* microrooms */
  registerDefaultMicroRooms();

  /* branding / themes */
  registerDefaultBrands();

  /* dashboards */
  registerWarRoomTemplate();

  bootstrapped = true;

  console.log("Platform bootstrap complete");

}