"use client"

import { useSession } from "next-auth/react"
import { RoleShell } from "@/components/shared/RoleShell"
import type { Role } from "@/components/shared/nav-items"

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const role = session?.user?.role as Role | undefined

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading…
      </div>
    )
  }

  if (!role) {
    return <>{children}</>
  }

  return <RoleShell role={role}>{children}</RoleShell>
}
