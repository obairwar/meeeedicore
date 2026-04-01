import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Noto_Nastaliq_Urdu } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { HtmlLang } from "@/components/shared/HtmlLang"
import { LocaleClientShell } from "@/components/shared/LocaleClientShell"
import { routing } from "@/i18n/routing"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const notoUrdu = Noto_Nastaliq_Urdu({
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-urdu",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MediCore HMS",
  description: "Intelligent Healthcare, Seamlessly Delivered",
  manifest: "/manifest.json",
  themeColor: "#0B1437",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MediCore HMS" },
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <HtmlLang locale={locale} />
      <LocaleClientShell />
      <div
        className={`${geistSans.variable} ${geistMono.variable} ${notoUrdu.variable} ${locale === "ur" ? "font-urdu" : ""}`}
      >
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
