import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { getToken } from "next-auth/jwt"

import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/dashboard",
  DOCTOR: "/doctor/dashboard",
  NURSE: "/nurse/dashboard",
  RECEPTIONIST: "/receptionist/dashboard",
  PHARMACIST: "/pharmacist/dashboard",
  LAB_TECHNICIAN: "/lab/dashboard",
  ADMIN: "/admin/dashboard",
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/book",
  "/feedback",
  "/queue",
  "/doctor",
  "/nurse",
  "/receptionist",
  "/pharmacist",
  "/lab",
  "/admin",
  "/notifications",
  "/video",
  "/maintenance",
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function expectedRoleForPath(pathname: string) {
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) return null
  if (pathname.startsWith("/video/")) return null
  if (pathname.startsWith("/maintenance")) return null
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "PATIENT"
  if (pathname === "/book" || pathname.startsWith("/book/")) return "PATIENT"
  if (pathname === "/feedback" || pathname.startsWith("/feedback/")) return "PATIENT"
  if (pathname === "/queue" || pathname.startsWith("/queue/")) return "PATIENT"
  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) return "DOCTOR"
  if (pathname === "/nurse" || pathname.startsWith("/nurse/")) return "NURSE"
  if (pathname === "/receptionist" || pathname.startsWith("/receptionist/")) return "RECEPTIONIST"
  if (pathname === "/pharmacist" || pathname.startsWith("/pharmacist/")) return "PHARMACIST"
  if (pathname === "/lab" || pathname.startsWith("/lab/")) return "LAB_TECHNICIAN"
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN"
  return null
}

function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return "/"
  const first = segments[0]
  if (routing.locales.includes(first as (typeof routing.locales)[number])) {
    const rest = "/" + segments.slice(1).join("/")
    return rest === "" ? "/" : rest
  }
  return pathname
}

function getLocaleFromPath(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0]
  if (first && routing.locales.includes(first as (typeof routing.locales)[number])) {
    return first
  }
  return routing.defaultLocale
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const intlResponse = intlMiddleware(request)
  if (intlResponse.headers.get("location") || intlResponse.headers.get("Location")) {
    return intlResponse
  }

  const bare = stripLocale(pathname)
  if (!isProtectedPath(bare)) {
    return intlResponse
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const locale = getLocaleFromPath(pathname)

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  const role = token.role as string | undefined
  const expected = expectedRoleForPath(bare)

  if (bare.startsWith("/video/")) {
    if (role !== "PATIENT" && role !== "DOCTOR") {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${ROLE_HOME[role ?? ""] ?? "/login"}`
      url.search = ""
      return NextResponse.redirect(url)
    }
    return intlResponse
  }

  if (bare.startsWith("/maintenance/new")) {
    const staff = ["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "PHARMACIST", "LAB_TECHNICIAN"]
    if (!role || !staff.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${ROLE_HOME[role ?? ""] ?? "/login"}`
      url.search = ""
      return NextResponse.redirect(url)
    }
    return intlResponse
  }

  if (role && expected && role !== expected) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${ROLE_HOME[role] ?? "/login"}`
    url.search = ""
    return NextResponse.redirect(url)
  }

  return intlResponse
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
