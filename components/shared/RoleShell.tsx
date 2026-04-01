"use client"

import type { Role } from "@/components/shared/nav-items"
import { AppShell } from "@/components/layout/AppShell"

export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  return <AppShell role={role}>{children}</AppShell>
}

