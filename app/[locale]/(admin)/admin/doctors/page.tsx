import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/admin-auth"
import { getAdminDoctorRows } from "@/lib/admin-doctors-list"

import { AdminDoctorsListClient } from "./admin-doctors-list-client"

export const revalidate = 60

export default async function AdminDoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const admin = await requireAdmin()
  if (!admin) redirect(`/${locale}/login`)

  const rows = await getAdminDoctorRows()
  return <AdminDoctorsListClient initialRows={rows} />
}
