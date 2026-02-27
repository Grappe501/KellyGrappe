
// app/src/shared/utils/telemetry.ts
export async function logTelemetry(event: string, data?: any) {
  try {
    console.log("[Telemetry]", event, data || {});
  } catch (e) {
    console.error("Telemetry error", e);
  }
}
