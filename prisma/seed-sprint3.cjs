const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const departments = [
    { code: "CARD", name: "Cardiology", floor: "2nd Floor" },
    { code: "NEURO", name: "Neurology", floor: "3rd Floor" },
    { code: "ORTHO", name: "Orthopedics", floor: "1st Floor" },
    { code: "PEDS", name: "Pediatrics", floor: "Ground Floor" },
    { code: "GEN", name: "General Medicine", floor: "Ground Floor" },
    { code: "ENT", name: "ENT", floor: "1st Floor" },
  ]

  const deptRows = {}
  for (const d of departments) {
    deptRows[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, floor: d.floor },
      create: d,
    })
  }

  const doctors = [
    { dept: "CARD", name: "Dr. Aarav Mehta", specialization: "Interventional Cardiology", experienceYears: 12, rating: 4.7, fee: 700 },
    { dept: "CARD", name: "Dr. Sana Qureshi", specialization: "Cardiac Electrophysiology", experienceYears: 9, rating: 4.6, fee: 650 },
    { dept: "NEURO", name: "Dr. Rohan Iyer", specialization: "Neurology", experienceYears: 11, rating: 4.6, fee: 750 },
    { dept: "NEURO", name: "Dr. Hira Siddiqui", specialization: "Neurosciences", experienceYears: 8, rating: 4.5, fee: 600 },
    { dept: "ORTHO", name: "Dr. Kabir Singh", specialization: "Orthopedic Surgery", experienceYears: 10, rating: 4.5, fee: 550 },
    { dept: "ORTHO", name: "Dr. Neha Kapoor", specialization: "Sports Medicine", experienceYears: 7, rating: 4.4, fee: 500 },
    { dept: "PEDS", name: "Dr. Ayesha Khan", specialization: "Pediatrics", experienceYears: 9, rating: 4.8, fee: 450 },
    { dept: "PEDS", name: "Dr. Farhan Ali", specialization: "Neonatology", experienceYears: 6, rating: 4.5, fee: 400 },
    { dept: "GEN", name: "Dr. Priya Nair", specialization: "Internal Medicine", experienceYears: 13, rating: 4.7, fee: 500 },
    { dept: "GEN", name: "Dr. Imran Sheikh", specialization: "General Physician", experienceYears: 8, rating: 4.4, fee: 350 },
    { dept: "ENT", name: "Dr. Zainab Noor", specialization: "ENT", experienceYears: 10, rating: 4.6, fee: 450 },
    { dept: "ENT", name: "Dr. Aditya Verma", specialization: "Head & Neck", experienceYears: 9, rating: 4.5, fee: 480 },
  ]

  // Simple repeated schedule: Mon-Sat, 10:00-16:00, 15 min slots
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
  for (const d of doctors) {
    const doc = await prisma.doctor.upsert({
      where: { id: `seed_${d.dept}_${d.name.replace(/\s+/g, "_")}` },
      update: {},
      create: {
        id: `seed_${d.dept}_${d.name.replace(/\s+/g, "_")}`,
        departmentId: deptRows[d.dept].id,
        name: d.name,
        specialization: d.specialization,
        experienceYears: d.experienceYears,
        rating: d.rating,
        consultationFee: d.fee,
        bio: `${d.name} is a ${d.specialization} specialist with ${d.experienceYears} years of experience.`,
        photoUrl: null,
      },
    })

    for (const day of days) {
      await prisma.doctorSchedule.upsert({
        where: { doctorId_dayOfWeek: { doctorId: doc.id, dayOfWeek: day } },
        update: { workStartTime: "10:00", workEndTime: "16:00", slotDurationMinutes: 15 },
        create: { doctorId: doc.id, dayOfWeek: day, workStartTime: "10:00", workEndTime: "16:00", slotDurationMinutes: 15 },
      })
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

