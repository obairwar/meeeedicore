import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function ageFromDob(d: Date) {
  const t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a
}

function ageGroup(a: number) {
  if (a <= 10) return "0-10"
  if (a <= 20) return "11-20"
  if (a <= 30) return "21-30"
  if (a <= 40) return "31-40"
  if (a <= 50) return "41-50"
  if (a <= 60) return "51-60"
  if (a <= 70) return "61-70"
  return "71+"
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = Math.min(365, Math.max(1, Number(searchParams.get("period") ?? "30") || 30))

  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - period)
  periodStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    totalPatients,
    patientsToday,
    activeQueue,
    paymentsPeriod,
    paymentsToday,
    bedsOccupied,
    bedsTotal,
    medicalRecords,
    appointmentsPeriod,
    appointmentsMonth,
    usersPatients,
    queueEntries,
    doctors,
    departments,
    paymentsAll,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        },
      },
    }),
    prisma.queueEntry.count({
      where: { status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: periodStart }, status: "PAID" },
      include: { appointment: { include: { department: true, doctor: true } } },
    }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    }),
    prisma.bed.count({ where: { status: "OCCUPIED" } }),
    prisma.bed.count(),
    prisma.medicalRecord.findMany({
      where: { diagnosis: { not: null } },
      include: { appointment: { include: { department: true } } },
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: periodStart } },
      include: { department: true, doctor: true },
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: monthStart } },
    }),
    prisma.user.findMany({ where: { role: "PATIENT" } }),
    prisma.queueEntry.findMany({
      include: { doctor: { include: { department: true } } },
    }),
    prisma.doctor.findMany({ include: { department: true } }),
    prisma.department.findMany(),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { not: null } },
      include: { appointment: { include: { department: true, doctor: true } } },
    }),
  ])

  const revenueToday = paymentsToday.reduce((s, p) => s + p.amount, 0)

  const diseaseCounts: Record<string, number> = {}
  for (const r of medicalRecords) {
    const d = r.diagnosis?.trim() || "Unknown"
    diseaseCounts[d] = (diseaseCounts[d] ?? 0) + 1
  }
  const topDiseases = Object.entries(diseaseCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)

  const topDisease = topDiseases[0]?.diagnosis ?? "—"

  const noShowMonth = appointmentsMonth.filter((a) => a.status === "NO_SHOW").length
  const totalMonth = appointmentsMonth.length || 1
  const noShowRate = Math.round((noShowMonth / totalMonth) * 1000) / 10

  const ageGroups: Record<string, number> = {}
  for (const u of usersPatients) {
    if (!u.dateOfBirth) continue
    const g = ageGroup(ageFromDob(u.dateOfBirth))
    ageGroups[g] = (ageGroups[g] ?? 0) + 1
  }

  const genderCounts: Record<string, number> = { MALE: 0, FEMALE: 0, OTHER: 0 }
  for (const u of usersPatients) {
    const k = u.gender ?? "OTHER"
    genderCounts[k] = (genderCounts[k] ?? 0) + 1
  }

  const bloodCounts: Record<string, number> = {}
  for (const u of usersPatients) {
    const b = u.bloodGroup ?? "Unknown"
    bloodCounts[b] = (bloodCounts[b] ?? 0) + 1
  }

  const newPerMonth: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
    newPerMonth[key] = 0
  }
  for (const u of usersPatients) {
    const dt = u.createdAt
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
    if (key in newPerMonth) newPerMonth[key]++
  }

  const avgWaitByDept: { department: string; avgMinutes: number }[] = []
  const byDept = new Map<string, number[]>()
  for (const q of queueEntries) {
    const name = q.doctor.department.name
    if (!byDept.has(name)) byDept.set(name, [])
    byDept.get(name)!.push(q.estimatedWaitMinutes)
  }
  for (const [department, arr] of byDept) {
    avgWaitByDept.push({
      department,
      avgMinutes: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
    })
  }

  const peakMap = new Map<string, number>()
  for (const a of appointmentsPeriod) {
    const dt = a.startsAt
    const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dt.getDay()]
    const hour = dt.getHours()
    const key = `${dow}-${hour}`
    peakMap.set(key, (peakMap.get(key) ?? 0) + 1)
  }
  const peakHours = Array.from(peakMap.entries()).map(([k, count]) => {
    const [day, hour] = k.split("-")
    return { day, hour: Number(hour), count }
  })

  const noShowByDept: { department: string; rate: number }[] = []
  for (const d of departments) {
    const total = appointmentsPeriod.filter((a) => a.departmentId === d.id).length || 1
    const ns = appointmentsPeriod.filter((a) => a.departmentId === d.id && a.status === "NO_SHOW").length
    noShowByDept.push({ department: d.name, rate: Math.round((ns / total) * 1000) / 10 })
  }

  const hourBuckets = new Map<number, number>()
  for (const a of appointmentsPeriod) {
    const h = a.startsAt.getHours()
    hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + 1)
  }
  const queueByHour = Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => ({
    hour,
    avgLength: hourBuckets.get(hour) ?? 0,
  }))

  const dailyRevenue: { date: string; amount: number }[] = []
  const revDay = new Map<string, number>()
  for (const p of paymentsPeriod) {
    if (!p.paidAt) continue
    const key = p.paidAt.toISOString().slice(0, 10)
    revDay.set(key, (revDay.get(key) ?? 0) + p.amount)
  }
  for (const [date, amount] of Array.from(revDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    dailyRevenue.push({ date, amount })
  }

  const revenueByDept: { department: string; amount: number }[] = []
  const rbd = new Map<string, number>()
  for (const p of paymentsPeriod) {
    const name = p.appointment?.department.name ?? "—"
    rbd.set(name, (rbd.get(name) ?? 0) + p.amount)
  }
  for (const [department, amount] of rbd) revenueByDept.push({ department, amount })

  const doctorRev = new Map<string, number>()
  for (const p of paymentsPeriod) {
    const name = p.appointment?.doctor.name ?? "—"
    doctorRev.set(name, (doctorRev.get(name) ?? 0) + p.amount)
  }
  const topDoctors = Array.from(doctorRev.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  const doctorPerformance = doctors.map((doc) => {
    const monthAppts = appointmentsMonth.filter((a) => a.doctorId === doc.id)
    const completed = monthAppts.filter((a) => a.status === "COMPLETED").length
    const ns = monthAppts.filter((a) => a.status === "NO_SHOW").length
    const rev = paymentsAll
      .filter((p) => p.appointment?.doctorId === doc.id && p.paidAt && p.paidAt >= monthStart)
      .reduce((s, p) => s + p.amount, 0)
    return {
      doctorId: doc.id,
      name: doc.name,
      department: doc.department.name,
      patientsThisMonth: monthAppts.length,
      avgConsultMinutes: 20,
      rating: doc.rating,
      completionRate: monthAppts.length ? Math.round((completed / monthAppts.length) * 100) : 0,
      noShowRate: monthAppts.length ? Math.round((ns / monthAppts.length) * 100) : 0,
      revenue: rev,
    }
  })

  const waitToday = await prisma.queueEntry.findMany({
    where: {
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    },
  })
  const avgWaitToday = waitToday.length
    ? Math.round(waitToday.reduce((s, q) => s + q.estimatedWaitMinutes, 0) / waitToday.length)
    : 0

  const diseaseTrend: { month: string; diseases: Record<string, number> }[] = []
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(dt.getFullYear(), dt.getMonth() + 1, 1)
    const monthKey = dt.toLocaleString("en", { month: "short", year: "numeric" })
    const slice = medicalRecords.filter((r) => r.createdAt >= dt && r.createdAt < next)
    const diseases: Record<string, number> = {}
    for (const r of slice) {
      const d = r.diagnosis?.trim() ?? "Unknown"
      diseases[d] = (diseases[d] ?? 0) + 1
    }
    diseaseTrend.push({ month: monthKey, diseases })
  }

  const top5 = new Set(topDiseases.slice(0, 5).map((x) => x.diagnosis))
  const diseaseByDept: { department: string; diseases: Record<string, number> }[] = []
  for (const d of departments) {
    const diseases: Record<string, number> = {}
    for (const r of medicalRecords) {
      if (r.appointment?.departmentId !== d.id) continue
      const diag = r.diagnosis?.trim() ?? "Unknown"
      if (!top5.has(diag) && top5.size > 0) continue
      diseases[diag] = (diseases[diag] ?? 0) + 1
    }
    diseaseByDept.push({ department: d.name, diseases })
  }

  return NextResponse.json({
    period,
    kpis: {
      totalPatients,
      patientsToday,
      activeQueue,
      avgWaitToday,
      revenueToday,
      bedsOccupied,
      bedsTotal,
      noShowRate,
      topDisease,
    },
    diseases: {
      topDiseases,
      diseaseTrend,
      diseaseByDept,
    },
    demographics: {
      ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
      gender: Object.entries(genderCounts).map(([gender, count]) => ({ gender, count })),
      bloodGroups: Object.entries(bloodCounts).map(([bloodGroup, count]) => ({ bloodGroup, count })),
      newPatientsPerMonth: Object.entries(newPerMonth).map(([month, count]) => ({ month, count })),
    },
    queue: {
      avgWaitByDept,
      peakHours,
      noShowByDept,
      queueByHour,
    },
    financial: {
      dailyRevenue,
      revenueByDept,
      topDoctors,
    },
    doctorPerformance,
  })
}
