import { RoleShell } from "@/components/shared/RoleShell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="ADMIN">{children}</RoleShell>
}

