"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { signOut, useSession } from "next-auth/react"
import { Globe, Menu } from "lucide-react"
import { usePathname, useRouter } from "@/i18n/navigation"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/shared/Sidebar"
import { NotificationBell } from "@/components/shared/NotificationBell"
import type { Role } from "@/components/shared/nav-items"

const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/dashboard",
  DOCTOR: "/doctor/dashboard",
  NURSE: "/nurse/dashboard",
  RECEPTIONIST: "/receptionist/dashboard",
  PHARMACIST: "/pharmacist/dashboard",
  LAB_TECHNICIAN: "/lab/dashboard",
  ADMIN: "/admin/dashboard",
}

function initials(name?: string | null) {
  const n = (name ?? "").trim()
  if (!n) return "U"
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("")
}

export function Navbar({ role }: { role: Role }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("nav")

  async function setLanguage(nextLocale: "en" | "ur" | "hi") {
    if (session?.user?.id) {
      await fetch(`/api/users/${session.user.id}/language`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      }).catch(() => {})
    }
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <header className="h-14 border-b bg-white px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger
            className="md:hidden"
            render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="p-4">
              <SheetTitle>{t("menu")}</SheetTitle>
            </SheetHeader>
            <Sidebar role={role} />
          </SheetContent>
        </Sheet>

        <Link href={ROLE_HOME[role]}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-sky-600" aria-hidden />
            <span className="font-semibold text-slate-900 hidden sm:inline">{t("brand")}</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("language")} />}>
            <Globe className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void setLanguage("en")}>English (EN)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void setLanguage("ur")}>اردو (UR)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void setLanguage("hi")}>हिंदी (HI)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="gap-2 px-2" />}
            aria-label={t("account")}
          >
            <>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(session?.user?.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-700 hidden sm:inline">{session?.user?.name ?? "User"}</span>
            </>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("account")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(role === "PATIENT" ? "/dashboard/profile" : ROLE_HOME[role])}>
              {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(ROLE_HOME[role])}>{t("settings")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
              className="text-red-600 focus:text-red-600"
            >
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
