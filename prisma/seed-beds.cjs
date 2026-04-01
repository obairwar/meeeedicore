const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const plan = [
    { ward: "GENERAL", count: 20, prefix: "G" },
    { ward: "ICU", count: 8, prefix: "I" },
    { ward: "EMERGENCY", count: 8, prefix: "E" },
    { ward: "PRIVATE", count: 4, prefix: "P" },
  ]

  for (const w of plan) {
    for (let i = 1; i <= w.count; i++) {
      const bedNumber = `${w.prefix}-${String(i).padStart(2, "0")}`
      await prisma.bed.upsert({
        where: { ward_bedNumber: { ward: w.ward, bedNumber } },
        update: {},
        create: { ward: w.ward, bedNumber, status: "AVAILABLE" },
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

