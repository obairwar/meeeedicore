import en from "@/locales/en.json"
import ur from "@/locales/ur.json"
import hi from "@/locales/hi.json"

const bundles = { en, ur, hi } as const

type LocaleKey = keyof typeof bundles

function pickLocale(code: string | null | undefined): LocaleKey {
  if (code === "ur" || code === "hi") return code
  return "en"
}

export function getNotificationBundle(preferredLanguage: string | null | undefined) {
  return bundles[pickLocale(preferredLanguage)]
}

export function formatQueueMessage(
  template: string,
  vars: Record<string, string | number | undefined>
) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""))
}
