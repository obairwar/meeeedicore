import { prisma } from "@/lib/prisma"

export type AdminDoctorRow = {
  id: string
  name: string
  specialization: string
  departmentName: string
  rating: number
  appointmentCount: number
  completionRate: number
  revenue: number
}

export async function getAdminDoctorRows(): Promise<AdminDoctorRow[]> {
  const doctors = await prisma.doctor.findMany({
    orderBy: { name: "asc" },
    include: {
      department: true,
      appointments: {
        select: {
          id: true,
          status: true,
          payments: { where: { status: "PAID" }, select: { amount: true } },
        },
      },
    },
  })

  return doctors.map((d) => {
    let revenue = 0
    let completed = 0
    for (const a of d.appointments) {
      if (a.status === "COMPLETED") completed += 1
      for (const p of a.payments) revenue += p.amount
    }
    const total = d.appointments.length || 1
    return {
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      departmentName: d.department.name,
      rating: d.rating,
      appointmentCount: d.appointments.length,
      completionRate: Math.round((completed / total) * 1000) / 10,
      revenue,
    }
  })
}
