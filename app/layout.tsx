import "./globals.css"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"

import { Providers } from "@/components/shared/Providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@700,600&f[]=satoshi@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`mc-body min-h-full flex flex-col antialiased ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
