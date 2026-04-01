import { RoleShell } from "@/components/shared/RoleShell"

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="RECEPTIONIST">{children}</RoleShell>
}

