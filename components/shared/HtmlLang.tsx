"use client"

import { useEffect } from "react"

export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ur" ? "rtl" : "ltr"
    if (locale === "ur") {
      document.documentElement.classList.add("font-urdu")
    } else {
      document.documentElement.classList.remove("font-urdu")
    }
  }, [locale])

  return null
}
