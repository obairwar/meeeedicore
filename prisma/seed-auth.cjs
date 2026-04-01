const { PrismaClient } = require("@prisma/client")
const { hash } = require("bcryptjs")

const prisma = new PrismaClient()

async function upsertUser({ email, name, role, password }) {
  const passwordHash = await hash(password, 12)
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: {
      email,
      name,
      role,
      passwordHash,
      phone: "9999999999",
      bloodGroup: "O+",
      address: "Demo address",
    },
  })
}

async function main() {
  await upsertUser({ email: "patient@hospital.com", name: "Demo Patient", role: "PATIENT", password: "Admin@123" })
  const doctorUser = await upsertUser({
    email: "doctor@hospital.com",
    name: "Dr. Ayesha Khan",
    role: "DOCTOR",
    password: "Admin@123",
  })
  const doctor1User = await upsertUser({
    email: "doctor1@hospital.com",
    name: "Dr. Primary Queue",
    role: "DOCTOR",
    password: "Doctor@123",
  })
  await upsertUser({ email: "nurse@hospital.com", name: "Demo Nurse", role: "NURSE", password: "Admin@123" })
  await upsertUser({
    email: "receptionist@hospital.com",
    name: "Demo Receptionist",
    role: "RECEPTIONIST",
    password: "Admin@123",
  })
  await upsertUser({
    email: "reception@hospital.com",
    name: "Reception Desk",
    role: "RECEPTIONIST",
    password: "Recept@123",
  })
  await upsertUser({ email: "pharmacist@hospital.com", name: "Demo Pharmacist", role: "PHARMACIST", password: "Admin@123" })
  await upsertUser({ email: "lab@hospital.com", name: "Demo Lab Tech", role: "LAB_TECHNICIAN", password: "Admin@123" })
  await upsertUser({ email: "admin@hospital.com", name: "System Admin", role: "ADMIN", password: "Admin@123" })
  await upsertUser({
    email: "ahmad.mir@test.com",
    name: "Ahmad Mir",
    role: "PATIENT",
    password: "Patient@123",
  })

  const ayesha = await prisma.doctor.findFirst({
    where: { name: "Dr. Ayesha Khan" },
  })
  if (ayesha && doctorUser?.id) {
    await prisma.doctor.update({
      where: { id: ayesha.id },
      data: { userId: doctorUser.id },
    })
  }

  const dept = await prisma.department.findFirst()
  if (dept && doctor1User?.id) {
    const existingDoc1 = await prisma.doctor.findFirst({ where: { userId: doctor1User.id } })
    if (!existingDoc1) {
      await prisma.doctor.create({
        data: {
          userId: doctor1User.id,
          name: "Dr. Primary Queue",
          departmentId: dept.id,
          specialization: "General Medicine",
          experienceYears: 8,
          consultationFee: 600,
        },
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
