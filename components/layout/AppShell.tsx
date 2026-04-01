"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Stethoscope,
  Activity,
} from "lucide-react"

import { navItemsByRole, type Role } from "@/components/shared/nav-items"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { SOSButton } from "@/components/shared/SOSButton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

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
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function roleLabel(role: Role) {
  return role.replaceAll("_", " ")
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean)
  const labels = segments.map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
  return (
    <nav className="hidden text-sm text-[var(--mc-text-soft)] md:flex md:items-center md:gap-1.5" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-[var(--mc-blue)]">
        Home
      </Link>
      {labels.slice(0, 4).map((label, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-[var(--mc-muted)]">/</span>
          <span className={i === labels.length - 1 ? "font-medium text-[var(--mc-text)]" : ""}>{label}</span>
        </span>
      ))}
    </nav>
  )
}

function NavList({
  role,
  collapsed,
  onNavigate,
}: {
  role: Role
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const items = navItemsByRole[role]

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const showDot = item.labelKey === "notifications"
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? t(item.labelKey as never) : undefined}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "bg-white/10 font-semibold text-white shadow-sm"
                : "text-white/55 hover:bg-white/5 hover:text-white/90"
            )}
          >
            {active ? (
              <span
                className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[var(--mc-blue)]"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center",
                active ? "text-[var(--mc-blue-light)]" : "text-white/50 group-hover:text-white/80"
              )}
            >
              {item.icon}
              {showDot && !collapsed ? (
                <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[var(--emergency)] ring-2 ring-[var(--navy)]" />
              ) : null}
            </span>
            {!collapsed ? <span>{t(item.labelKey as never)}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!open) setQ("")
  }, [open])

  const go = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          role="presentation"
          onClick={() => onOpenChange(false)}
        />
      ) : null}
      <div
        className={cn(
          "fixed left-1/2 top-[15%] z-[101] w-[min(100%,480px)] -translate-x-1/2 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)] p-4 shadow-2xl transition-all",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <div className="flex items-center gap-2 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-bg)] px-3">
          <Search className="h-4 w-4 text-[var(--mc-muted)]" />
          <Input
            className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Search patients, doctors, appointments…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus={open}
          />
          <kbd className="hidden rounded border bg-white px-1.5 py-0.5 text-[10px] text-[var(--mc-muted)] sm:inline">⌘K</kbd>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--mc-muted)]">Quick links</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => go("/dashboard")}>
            Patient home
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => go("/book")}>
            Book
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => go("/receptionist/dashboard")}>
            Reception
          </Button>
        </div>
      </div>
    </>
  )
}

function PatientMobileNav() {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const items = [
    { href: "/dashboard", icon: Home, label: t("dashboard") },
    { href: "/queue", icon: ClipboardList, label: t("myQueue") },
    { href: "/dashboard/book", icon: Stethoscope, label: t("bookAppointment") },
    { href: "/dashboard/records", icon: Activity, label: t("medicalRecords") },
    { href: "/dashboard/profile", icon: LayoutDashboard, label: t("menu") },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch justify-around border-t border-[var(--mc-border)] bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.08)] md:hidden">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
              active ? "text-[var(--mc-blue)]" : "text-[var(--mc-muted)]"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate px-0.5">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem("mediCore.sidebarCollapsed")
      if (v === "1") setCollapsed(true)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem("mediCore.sidebarCollapsed", next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const immersivePatientQueue = role === "PATIENT" && /^\/queue\/[^/]+/.test(pathname)

  if (immersivePatientQueue) {
    return (
      <>
        <div className="page-enter min-h-screen">{children}</div>
        {role === "PATIENT" ? <SOSButton /> : null}
      </>
    )
  }

  const sidebarW = collapsed ? "w-[72px]" : "w-[260px]"

  return (
    <div className="flex min-h-screen bg-[var(--mc-bg)]">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-white/5 md:flex",
          sidebarW,
          "bg-[var(--navy)] text-white transition-[width] duration-300 ease-out"
        )}
        style={{ background: "var(--grad-navy)" }}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mc-blue)] shadow-lg shadow-blue-900/40">
              <span className="text-lg font-bold text-white">+</span>
              <span className="absolute inset-0 rounded-full ring-2 ring-white/20" aria-hidden />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="mc-display truncate text-lg font-bold leading-tight tracking-tight text-white">MediCore</div>
                <span className="mt-0.5 inline-block rounded-md bg-[var(--mc-teal)]/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-200">
                  HMS
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-3 pt-4">
          {!collapsed ? (
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Main menu</p>
          ) : null}
          <NavList role={role} collapsed={collapsed} />
        </div>

        <div className="mt-auto border-t border-white/10 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mb-3 flex w-full items-center justify-center rounded-lg py-2 text-white/50 transition hover:bg-white/5 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className={cn("flex items-center gap-2 rounded-xl bg-white/5 p-2", collapsed && "justify-center p-1.5")}>
            <Avatar className="h-9 w-9 border border-white/20">
              <AvatarFallback className="bg-gradient-to-br from-[var(--mc-blue)] to-[var(--mc-teal)] text-xs font-bold text-white">
                {initials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{session?.user?.name ?? "User"}</div>
                <span className="inline-block rounded-full bg-[var(--mc-teal)]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-100">
                  {roleLabel(role)}
                </span>
              </div>
            ) : null}
            {!collapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 hover:text-white" />
                  }
                  aria-label="Account menu"
                >
                  <Settings className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push(ROLE_HOME[role])}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--mc-border)] bg-white px-4 shadow-sm shadow-slate-900/5">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-[var(--navy)] bg-[var(--navy)] p-0 text-white" style={{ background: "var(--grad-navy)" }}>
                <SheetHeader className="border-b border-white/10 p-4">
                  <SheetTitle className="text-left text-white">MediCore HMS</SheetTitle>
                </SheetHeader>
                <div className="p-2">
                  <NavList role={role} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Link href={ROLE_HOME[role]} className="mc-display font-bold text-[var(--mc-text)] md:hidden">
              MediCore
            </Link>
            <Breadcrumbs pathname={pathname} />
          </div>

          <div className="hidden max-w-md flex-1 px-4 md:block">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--mc-border)] bg-[var(--mc-bg)] px-3 text-left text-sm text-[var(--mc-muted)] transition hover:border-[var(--mc-blue)]/30"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search patients, doctors, appointments…</span>
              <kbd className="ml-auto hidden shrink-0 rounded border bg-white px-1.5 py-0.5 text-[10px] lg:inline">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setPaletteOpen(true)}>
              <Search className="h-5 w-5 text-[var(--mc-text-soft)]" />
            </Button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" className="gap-2 rounded-full px-2" />}
                aria-label="Account"
              >
                <>
                  <Avatar className="h-8 w-8 border border-[var(--mc-border)]">
                    <AvatarFallback className="bg-gradient-to-br from-[var(--mc-blue)] to-[var(--mc-teal)] text-xs text-white">
                      {initials(session?.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{session?.user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(role === "PATIENT" ? "/dashboard/profile" : ROLE_HOME[role])}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(ROLE_HOME[role])}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/notifications")}>Help</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => signOut({ callbackUrl: `/${locale}/login` })}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="page-enter flex-1 px-4 py-6 md:px-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {role === "PATIENT" ? <PatientMobileNav /> : null}
      {role === "PATIENT" ? <SOSButton /> : null}
    </div>
  )
}
