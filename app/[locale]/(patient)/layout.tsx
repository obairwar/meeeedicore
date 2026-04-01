import { RoleShell } from "@/components/shared/RoleShell"

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="PATIENT">{children}</RoleShell>
}

