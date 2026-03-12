export async function sms(payload?: unknown) {
  return {
    ok: true,
    message: "Sms service executed",
    payload
  }
}
