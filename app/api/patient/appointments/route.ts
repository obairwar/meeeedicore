import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiOk, apiUnauthorized } from "@/lib/api-response"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return apiUnauthorized()
  }

  const uid = session.user.id
  const now = new Date()

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [{ patientId: uid }, { familyMember: { userId: uid } }],
      startsAt: { gte: now },
      status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
    },
    orderBy: { startsAt: "asc" },
    include: {
      doctor: true,
      department: true,
      familyMember: true,
    },
  })

  return apiOk({
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      tokenCode: a.tokenCode,
      status: a.status,
      doctorName: a.doctor.name,
      departmentName: a.department.name,
      forPatientName: a.familyMember?.name ?? "You",
      familyMemberId: a.familyMemberId,
      consultationType: a.consultationType,
    })),
  })
}
