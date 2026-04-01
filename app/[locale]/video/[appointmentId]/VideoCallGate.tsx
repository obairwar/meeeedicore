"use client"

import dynamic from "next/dynamic"

type Role = "PATIENT" | "DOCTOR"

const PatientVideoCall = dynamic(
  () => import("./PatientVideoCall").then((m) => m.PatientVideoCall),
  { ssr: false, loading: () => <div className="p-8 text-center text-slate-600">Loading video…</div> }
)

const DoctorVideoCall = dynamic(
  () => import("./DoctorVideoCall").then((m) => m.DoctorVideoCall),
  { ssr: false, loading: () => <div className="p-8 text-center text-slate-600">Loading video…</div> }
)

export function VideoCallGate(props: {
  appointmentId: string
  role: Role
  userId: string
  userName: string
  patientName?: string
  patientSymptoms?: string
  patientAgeLabel?: string
}) {
  if (props.role === "PATIENT") {
    return <PatientVideoCall appointmentId={props.appointmentId} userName={props.userName} />
  }
  return (
    <DoctorVideoCall
      appointmentId={props.appointmentId}
      userName={props.userName}
      patientName={props.patientName ?? "Patient"}
      patientSymptoms={props.patientSymptoms ?? "—"}
      patientAgeLabel={props.patientAgeLabel ?? "—"}
    />
  )
}
