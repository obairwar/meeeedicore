import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const tables = [
  ["User", () => p.user.count()],
  ["Department", () => p.department.count()],
  ["Doctor", () => p.doctor.count()],
  ["Appointment", () => p.appointment.count()],
  ["QueueEntry", () => p.queueEntry.count()],
]
for (const [name, fn] of tables) {
  console.log(`${name}:`, await fn())
}
await p.$disconnect()
