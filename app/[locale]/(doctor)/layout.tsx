import { RoleShell } from "@/components/shared/RoleShell"

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="DOCTOR">{children}</RoleShell>
}

