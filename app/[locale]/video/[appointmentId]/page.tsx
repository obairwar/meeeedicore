import { redirect } from "@/i18n/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateAge } from "@/lib/utils"

import { VideoCallGate } from "./VideoCallGate"

export default async function VideoAppointmentPage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>
}) {
  const { appointmentId, locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect({ href: "/login", locale })
  const user = session!.user

  const uid = user.id
  const role = user.role

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { include: { user: true } }, patient: true },
  })
  if (!appt) {
    redirect({
      href: role === "PATIENT" ? "/dashboard" : "/doctor/dashboard",
      locale,
    })
  }

  const appointment = appt!

  if (role === "PATIENT" && appointment.patientId !== uid) redirect({ href: "/dashboard", locale })
  if (role === "DOCTOR" && appointment.doctor.userId !== uid) redirect({ href: "/doctor/dashboard", locale })
  if (role !== "PATIENT" && role !== "DOCTOR") redirect({ href: "/", locale })

  if (appointment.consultationType !== "VIDEO") {
    redirect({ href: role === "PATIENT" ? "/dashboard" : "/doctor/dashboard", locale })
  }

  const now = Date.now()
  const start = appointment.startsAt.getTime()
  if (Math.abs(now - start) > 60 * 60 * 1000) {
    redirect({ href: role === "PATIENT" ? "/dashboard" : "/doctor/dashboard", locale })
  }

  const patientAgeLabel = appointment.patient.dateOfBirth
    ? `${calculateAge(appointment.patient.dateOfBirth)} yrs`
    : "—"

  return (
    <VideoCallGate
      appointmentId={appointmentId}
      role={role}
      userId={uid}
      userName={user.name ?? "User"}
      patientName={appointment.patient.name}
      patientSymptoms={appointment.symptoms}
      patientAgeLabel={patientAgeLabel}
    />
  )
}
