import {
  PrismaClient,
  Role,
  AppointmentStatus,
  QueueStatus,
  Priority,
  DayOfWeek,
  Gender,
  LabStatus,
  PaymentStatus,
} from "@prisma/client"
import { hash } from "bcryptjs"

import { generateTokenCode } from "../lib/utils"

const prisma = new PrismaClient()

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

async function wipe() {
  await prisma.queueEntry.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.labOrder.deleteMany()
  await prisma.medicalRecord.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.doctorSchedule.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.maintenanceRequest.deleteMany()
  await prisma.visitor.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.bed.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.familyMember.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  await prisma.systemSettings.deleteMany().catch(() => {})
}

const diagnosesSeed = [
  {
    diagnosis: "Acute Viral Fever",
    medicines: [
      { name: "Paracetamol", dosage: "500mg", frequency: "TID", duration: "5 days" },
      { name: "Cetirizine", dosage: "10mg", frequency: "OD", duration: "3 days" },
    ],
  },
  {
    diagnosis: "Hypertension",
    medicines: [
      { name: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "30 days" },
      { name: "Losartan", dosage: "50mg", frequency: "OD", duration: "30 days" },
    ],
  },
  {
    diagnosis: "Type 2 Diabetes",
    medicines: [
      { name: "Metformin", dosage: "500mg", frequency: "BD", duration: "30 days" },
      { name: "Glimepiride", dosage: "2mg", frequency: "OD", duration: "30 days" },
    ],
  },
  {
    diagnosis: "Acute Gastroenteritis",
    medicines: [
      { name: "ORS", dosage: "1 sachet", frequency: "TID", duration: "3 days" },
      { name: "Ondansetron", dosage: "4mg", frequency: "BD", duration: "3 days" },
      { name: "Metronidazole", dosage: "400mg", frequency: "TID", duration: "5 days" },
    ],
  },
  {
    diagnosis: "Upper Respiratory Tract Infection",
    medicines: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "TID", duration: "7 days" },
      { name: "Bromhexine", dosage: "8mg", frequency: "TID", duration: "5 days" },
    ],
  },
  {
    diagnosis: "Migraine",
    medicines: [
      { name: "Sumatriptan", dosage: "50mg", frequency: "SOS", duration: "As needed" },
      { name: "Propranolol", dosage: "40mg", frequency: "BD", duration: "30 days" },
    ],
  },
  {
    diagnosis: "Anemia",
    medicines: [
      { name: "Ferrous Sulfate", dosage: "200mg", frequency: "BD", duration: "30 days" },
      { name: "Folic Acid", dosage: "5mg", frequency: "OD", duration: "30 days" },
    ],
  },
  {
    diagnosis: "Osteoarthritis",
    medicines: [
      { name: "Diclofenac", dosage: "50mg", frequency: "BD", duration: "7 days" },
      { name: "Pantoprazole", dosage: "40mg", frequency: "OD", duration: "7 days" },
    ],
  },
  {
    diagnosis: "Anxiety Disorder",
    medicines: [
      { name: "Escitalopram", dosage: "10mg", frequency: "OD", duration: "30 days" },
      { name: "Clonazepam", dosage: "0.5mg", frequency: "OD", duration: "14 days" },
    ],
  },
  {
    diagnosis: "Urinary Tract Infection",
    medicines: [
      { name: "Nitrofurantoin", dosage: "100mg", frequency: "BD", duration: "7 days" },
      { name: "Phenazopyridine", dosage: "200mg", frequency: "TID", duration: "2 days" },
    ],
  },
]

const labTests = [
  "CBC",
  "LFT",
  "RFT",
  "Blood Sugar Fasting",
  "HbA1c",
  "Lipid Profile",
  "Urine R/E",
  "ECG",
  "Chest X-Ray",
  "USG Abdomen",
]

const labResultSamples: Record<string, string> = {
  CBC: "Hb 13.2 g/dL, WBC 7.8, platelets 240 — within reference",
  LFT: "AST 28 U/L, ALT 32 U/L, bilirubin 0.9 mg/dL — normal",
  RFT: "Creatinine 0.9 mg/dL, urea 28 mg/dL — normal",
  "Blood Sugar Fasting": "92 mg/dL — normal",
  HbA1c: "5.6% — good control",
  "Lipid Profile": "LDL 98, HDL 48, TG 120 mg/dL",
  "Urine R/E": "No pus cells; trace protein",
  ECG: "Sinus rhythm, rate 72, no acute ischemia",
  "Chest X-Ray": "Clear lung fields, no infiltrate",
  "USG Abdomen": "Liver and kidneys unremarkable",
}

async function main() {
  console.log("🌱 Seeding database...")
  await wipe()

  const password = await hash("Test@1234", 10)
  const adminPass = await hash("Admin@123", 10)
  const doctorPass = await hash("Doctor@123", 10)
  const receptPass = await hash("Recept@123", 10)

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@hospital.com",
      phone: "9000000001",
      passwordHash: adminPass,
      role: Role.ADMIN,
    },
  })
  console.log("✅ Admin:", admin.email)

  await prisma.user.create({
    data: {
      name: "Rehan Ali",
      email: "reception@hospital.com",
      phone: "9000000002",
      passwordHash: receptPass,
      role: Role.RECEPTIONIST,
    },
  })

  const departments = await Promise.all([
    prisma.department.create({
      data: { name: "General Medicine", code: "GEN", floor: "1", rooms: 10 },
    }),
    prisma.department.create({
      data: { name: "Cardiology", code: "CARD", floor: "2", rooms: 8 },
    }),
    prisma.department.create({
      data: { name: "Orthopedics", code: "ORTHO", floor: "3", rooms: 6 },
    }),
  ])
  console.log(
    "✅ Departments:",
    departments.map((d) => d.name)
  )

  const doctorUser1 = await prisma.user.create({
    data: {
      name: "Dr. Imran Khan",
      email: "doctor1@hospital.com",
      phone: "9000000010",
      passwordHash: doctorPass,
      role: Role.DOCTOR,
    },
  })
  const doctorUser2 = await prisma.user.create({
    data: {
      name: "Dr. Ayesha Malik",
      email: "doctor2@hospital.com",
      phone: "9000000011",
      passwordHash: doctorPass,
      role: Role.DOCTOR,
    },
  })

  const doctor1 = await prisma.doctor.create({
    data: {
      userId: doctorUser1.id,
      name: "Dr. Imran Khan",
      departmentId: departments[0]!.id,
      specialization: "General Physician",
      experienceYears: 10,
      consultationFee: 500,
    },
  })
  const doctor2 = await prisma.doctor.create({
    data: {
      userId: doctorUser2.id,
      name: "Dr. Ayesha Malik",
      departmentId: departments[1]!.id,
      specialization: "Cardiologist",
      experienceYears: 15,
      consultationFee: 800,
    },
  })

  const workDays: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"]
  for (const d of workDays) {
    await prisma.doctorSchedule.create({
      data: {
        doctorId: doctor1.id,
        dayOfWeek: d,
        workStartTime: "09:00",
        workEndTime: "17:00",
        slotDurationMinutes: 5,
      },
    })
    await prisma.doctorSchedule.create({
      data: {
        doctorId: doctor2.id,
        dayOfWeek: d,
        workStartTime: "10:00",
        workEndTime: "16:00",
        slotDurationMinutes: 20,
      },
    })
  }

  console.log("✅ Doctors:", doctorUser1.email, doctorUser2.email)

  const patientRows: Array<{
    name: string
    email: string
    phone: string
    gender: Gender
    dateOfBirth: Date
    bloodGroup: string
  }> = [
    { name: "Ahmad Mir", email: "ahmad.mir@test.com", phone: "9001000001", gender: Gender.MALE, dateOfBirth: new Date("1990-03-15"), bloodGroup: "B+" },
    { name: "Sara Khan", email: "sara.khan@test.com", phone: "9001000002", gender: Gender.FEMALE, dateOfBirth: new Date("1985-07-22"), bloodGroup: "O+" },
    { name: "Bilal Wani", email: "bilal.wani@test.com", phone: "9001000003", gender: Gender.MALE, dateOfBirth: new Date("2000-11-05"), bloodGroup: "A+" },
    { name: "Zara Bhat", email: "zara.bhat@test.com", phone: "9001000004", gender: Gender.FEMALE, dateOfBirth: new Date("1995-04-18"), bloodGroup: "AB+" },
    { name: "Umar Lone", email: "umar.lone@test.com", phone: "9001000005", gender: Gender.MALE, dateOfBirth: new Date("1978-09-30"), bloodGroup: "O-" },
  ]

  const patients = await Promise.all(
    patientRows.map((p) =>
      prisma.user.create({
        data: {
          name: p.name,
          email: p.email,
          phone: p.phone,
          passwordHash: password,
          role: Role.PATIENT,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          bloodGroup: p.bloodGroup,
        },
      })
    )
  )
  console.log("✅ Patients:", patients.length, "created")

  const symptoms = [
    "Fever and headache since 2 days",
    "Chest pain and mild breathlessness",
    "Knee pain and swelling",
    "Stomach ache and nausea",
    "Sore throat and cold",
  ]

  let historicalAppointments = 0
  let medicalRecordsCreated = 0
  const tokenCounters = new Map<string, number>()

  const doctorDeptPairs: { doc: typeof doctor1; dept: (typeof departments)[0] }[] = [
    { doc: doctor1, dept: departments[0]! },
    { doc: doctor2, dept: departments[1]! },
  ]

  for (let dayBack = 1; dayBack <= 30; dayBack++) {
    const day = new Date()
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - dayBack)
    const dow = day.getDay()
    if (dow === 0 || dow === 6) continue

    for (const { doc, dept } of doctorDeptPairs) {
      const n = randInt(8, 12)
      for (let i = 0; i < n; i++) {
        const r = Math.random()
        const status =
          r < 0.7 ? AppointmentStatus.COMPLETED : r < 0.85 ? AppointmentStatus.NO_SHOW : AppointmentStatus.CANCELLED

        const patient = patients[randInt(0, patients.length - 1)]!
        const hour = randInt(8, 17)
        const minute = [0, 15, 30, 45][randInt(0, 3)]
        const startsAt = new Date(day)
        startsAt.setHours(hour, minute, 0, 0)
        const endsAt = new Date(startsAt.getTime() + 30 * 60000)

        const dk = `${dept.code}-${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`
        const next = (tokenCounters.get(dk) ?? 0) + 1
        tokenCounters.set(dk, next)
        const tokenCode = generateTokenCode(dept.code, day, next)

        const appt = await prisma.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doc.id,
            departmentId: dept.id,
            tokenCode,
            status,
            startsAt,
            endsAt,
            symptoms: symptoms[i % symptoms.length] ?? "Follow-up",
            consultationFee: doc.consultationFee,
            priority: Priority.MEDIUM,
          },
        })
        historicalAppointments++

        if (status === AppointmentStatus.COMPLETED) {
          const diag = diagnosesSeed[randInt(0, diagnosesSeed.length - 1)]!
          const mr = await prisma.medicalRecord.create({
            data: {
              patientId: patient.id,
              doctorId: doc.id,
              appointmentId: appt.id,
              summary: `Outpatient visit — ${diag.diagnosis}`,
              diagnosis: diag.diagnosis,
              vitalsBp: `${110 + randInt(0, 30)}/${70 + randInt(0, 15)}`,
              vitalsPulse: 65 + randInt(0, 35),
              vitalsTemperature: 97 + Math.random() * 2,
            },
          })
          medicalRecordsCreated++

          for (const med of diag.medicines) {
            await prisma.prescription.create({
              data: {
                medicalRecordId: mr.id,
                medicineName: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
              },
            })
          }

          if (Math.random() < 0.4) {
            const k = randInt(1, 3)
            const picks = shuffle(labTests).slice(0, k)
            for (const testName of picks) {
              await prisma.labOrder.create({
                data: {
                  medicalRecordId: mr.id,
                  testName,
                  status: LabStatus.COMPLETED,
                  notes: labResultSamples[testName] ?? "See attached report",
                  completedAt: endsAt,
                },
              })
            }
          }

          await prisma.payment.create({
            data: {
              appointmentId: appt.id,
              amount: doc.consultationFee,
              status: PaymentStatus.PAID,
              paidAt: endsAt,
            },
          })
        }
      }
    }
  }

  console.log("✅ Historical appointments (past weekdays, ~30 days):", historicalAppointments)
  console.log("✅ Medical records (completed visits):", medicalRecordsCreated)

  const now = new Date()
  const dd = String(now.getDate()).padStart(2, "0")
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const yy = String(now.getFullYear()).slice(-2)
  const dateStr = `${dd}${mm}${yy}`

  for (let i = 0; i < 5; i++) {
    const tokenNumber = i + 1
    const tokenCode = `GEN-${dateStr}-${String(tokenNumber).padStart(3, "0")}`

    const slotTime = new Date()
    slotTime.setHours(9, i * 5, 0, 0)
    const endsAt = new Date(slotTime.getTime() + 5 * 60000)

    const apptStatus = i === 0 ? AppointmentStatus.IN_PROGRESS : AppointmentStatus.CONFIRMED
    const qStatus = i === 0 ? QueueStatus.IN_CONSULTATION : QueueStatus.WAITING

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patients[i]!.id,
        doctorId: doctor1.id,
        departmentId: departments[0]!.id,
        tokenCode,
        status: apptStatus,
        startsAt: slotTime,
        endsAt,
        symptoms: symptoms[i]!,
        consultationFee: doctor1.consultationFee,
        priority: Priority.MEDIUM,
      },
    })

    await prisma.queueEntry.create({
      data: {
        appointmentId: appointment.id,
        doctorId: doctor1.id,
        position: i + 1,
        status: qStatus,
        estimatedWaitMinutes: i * 5,
        calledAt: i === 0 ? new Date() : null,
        startedAt: i === 0 ? new Date() : null,
      },
    })

    console.log(
      `Token: ${tokenCode} | ${patients[i]!.name} | ${apptStatus} | Wait: ${i * 5} min`
    )
  }

  const totalAppts = await prisma.appointment.count()
  const totalMr = await prisma.medicalRecord.count()
  const totalUsers = await prisma.user.count()

  console.log("\n🎉 Seed complete!")
  console.log("─────────────────────────────")
  console.log("Summary:")
  console.log(`  Patients: ${patients.length}`)
  console.log(`  Doctors: 2`)
  console.log(`  Total appointments: ${totalAppts}`)
  console.log(`  Medical records: ${totalMr}`)
  console.log(`  Total users in DB: ${totalUsers}`)
  console.log("─────────────────────────────")
  console.log("✅ Admin:        admin@hospital.com")
  console.log("✅ Doctor 1:     doctor1@hospital.com")
  console.log("✅ Doctor 2:     doctor2@hospital.com")
  console.log("✅ Receptionist: reception@hospital.com")
  console.log("─────────────────────────────")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
