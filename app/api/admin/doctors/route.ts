import { NextResponse } from "next/server"

import { getAdminDoctorRows } from "@/lib/admin-doctors-list"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await getAdminDoctorRows()
  return NextResponse.json({ doctors: rows })
}
