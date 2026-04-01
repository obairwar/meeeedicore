export type SystemSettingsData = {
  hospitalName: string
  hospitalLogoUrl: string
  hospitalAddress: string
  hospitalPhone: string
  hospitalEmail: string
  tokenResetHour: number
  notifyGlobalEmail: boolean
  notifyGlobalSms: boolean
  notifyGlobalWhatsapp: boolean
  defaultSlotMinutes: number
  maxPatientsPerDoctor: number
}

export const defaultSystemSettings = (): SystemSettingsData => ({
  hospitalName: "City General Hospital",
  hospitalLogoUrl: "",
  hospitalAddress: "",
  hospitalPhone: "",
  hospitalEmail: "",
  tokenResetHour: 0,
  notifyGlobalEmail: true,
  notifyGlobalSms: true,
  notifyGlobalWhatsapp: true,
  defaultSlotMinutes: 15,
  maxPatientsPerDoctor: 40,
})

export function mergeSettings(json: string | null): SystemSettingsData {
  const base = defaultSystemSettings()
  if (!json) return base
  try {
    const o = JSON.parse(json) as Partial<SystemSettingsData>
    return { ...base, ...o }
  } catch {
    return base
  }
}
