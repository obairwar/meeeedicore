import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiErr, apiForbidden, apiNotFound, apiOk, apiUnauthorized } from "@/lib/api-response"

export async function GET(_req: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return apiUnauthorized()

  const { appointmentId } = await params

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { include: { user: true } } },
  })

  if (!appt) return apiNotFound("Appointment not found")

  const uid = session.user.id
  const role = session.user.role

  if (role === "PATIENT" && appt.patientId !== uid) {
    return apiForbidden("This appointment is not yours")
  }
  if (role === "DOCTOR" && appt.doctor.userId !== uid) {
    return apiForbidden("This appointment is not assigned to you")
  }
  if (role !== "PATIENT" && role !== "DOCTOR") {
    return apiForbidden("Video is only for patient and doctor")
  }

  if (appt.consultationType !== "VIDEO") {
    return apiErr("This appointment is not a video consultation", 400)
  }

  const hostConfigured = process.env.NEXT_PUBLIC_PEER_HOST
  const host = hostConfigured?.trim()
    ? hostConfigured.trim()
    : process.env.NODE_ENV === "production"
      ? ""
      : "127.0.0.1"
  const port = Number(process.env.NEXT_PUBLIC_PEER_PORT ?? process.env.PEER_PORT ?? 9000)
  const path = process.env.NEXT_PUBLIC_PEER_PATH ?? process.env.PEER_PATH ?? "/peerjs"
  const secure = process.env.NEXT_PUBLIC_PEER_SECURE === "true"

  const peerId = role === "PATIENT" ? `patient-${appointmentId}` : `doctor-${appointmentId}`

  return apiOk({
    peerId,
    peerConfig: { host, port, path, secure },
  })
}
