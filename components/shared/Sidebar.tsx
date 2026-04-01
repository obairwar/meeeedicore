"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"

import { cn } from "@/lib/utils"
import { navItemsByRole, type Role } from "@/components/shared/nav-items"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = navItemsByRole[role]
  const t = useTranslations("nav")

  return (
    <aside className="w-64 shrink-0 border-r bg-white hidden md:flex md:flex-col">
      <div className="h-14 px-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-sky-600" aria-hidden />
        <div className="font-semibold text-slate-900 leading-none">
          {t("brand")}
          <div className="text-xs font-normal text-slate-500 mt-1">{role.replaceAll("_", " ")}</div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
                  active && "bg-sky-50 text-sky-800"
                )}
              >
                <span className="text-slate-600">{item.icon}</span>
                <span>{t(item.labelKey as never)}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}

