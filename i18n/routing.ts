import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "ur", "hi"],
  defaultLocale: "en",
  localePrefix: "always",
})
