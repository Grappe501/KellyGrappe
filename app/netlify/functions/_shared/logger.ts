/* netlify/functions/_shared/logger.ts
   Simple structured logger for Netlify Functions.
   Produces consistent logs for debugging and monitoring.
*/

type LogLevel = "INFO" | "WARN" | "ERROR"

type LogPayload = {
  event: string
  function?: string
  contactId?: string
  origin?: string
  details?: any
}

function now() {
  return new Date().toISOString()
}

function write(level: LogLevel, payload: LogPayload) {
  const entry = {
    level,
    timestamp: now(),
    ...payload
  }

  // Netlify log output
  console.log(JSON.stringify(entry))
}

export function logInfo(payload: LogPayload) {
  write("INFO", payload)
}

export function logWarn(payload: LogPayload) {
  write("WARN", payload)
}

export function logError(payload: LogPayload) {
  write("ERROR", payload)
}