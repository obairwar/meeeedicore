import { RoleShell } from "@/components/shared/RoleShell"

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="LAB_TECHNICIAN">{children}</RoleShell>
}

