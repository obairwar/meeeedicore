import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: "NetworkFirst",
      options: { cacheName: "api", networkTimeoutSeconds: 10 },
    },
    {
      urlPattern: /\.(?:js|css|woff2?)$/i,
      handler: "CacheFirst",
      options: { cacheName: "static-assets" },
    },
    {
      urlPattern: /\/(en|ur|hi)\/(dashboard|queue)/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "pages" },
    },
  ],
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
}

export default withNextIntl(withPWA(nextConfig))
