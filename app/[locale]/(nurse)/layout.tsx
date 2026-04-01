import { RoleShell } from "@/components/shared/RoleShell"

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="NURSE">{children}</RoleShell>
}

