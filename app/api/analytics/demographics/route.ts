import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

function ageBucket(dob: Date | null): string {
  if (!dob) return "Unknown"
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 18) return "0-17"
  if (age < 35) return "18-34"
  if (age < 50) return "35-49"
  if (age < 65) return "50-64"
  return "65+"
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const patients = await prisma.user.findMany({
    where: { role: "PATIENT" },
    select: { dateOfBirth: true, gender: true },
  })

  const ageMap = new Map<string, number>()
  const genderMap = new Map<string, number>()
  for (const p of patients) {
    const b = ageBucket(p.dateOfBirth)
    ageMap.set(b, (ageMap.get(b) ?? 0) + 1)
    const g = p.gender ?? "UNKNOWN"
    genderMap.set(g, (genderMap.get(g) ?? 0) + 1)
  }

  const ageGroups = Array.from(ageMap.entries()).map(([name, value]) => ({ name, value }))
  const genderPie = Array.from(genderMap.entries()).map(([name, value]) => ({ name, value }))

  return NextResponse.json({ ageGroups, genderPie })
}
