import { RoleShell } from "@/components/shared/RoleShell"

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="PHARMACIST">{children}</RoleShell>
}

