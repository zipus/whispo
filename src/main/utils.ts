import { systemPreferences } from "electron"

export const isAccessibilityGranted = () => {
  if (process.platform === "win32" || process.platform === "linux") return true

  if (typeof (systemPreferences as any).isTrustedAccessibilityClient === "function") {
    return (systemPreferences as any).isTrustedAccessibilityClient(false)
  }

  return true
}
