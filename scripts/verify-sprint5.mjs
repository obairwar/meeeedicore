import { chromium } from "playwright"

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
  await page.getByLabel("Email").fill("receptionist@hospital.com")
  await page.locator("input#password").fill("Admin@123")
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForTimeout(1500)
  await page.goto("http://localhost:3000/receptionist/dashboard", { waitUntil: "domcontentloaded" })

  await page.goto("http://localhost:3000/receptionist/walkin", { waitUntil: "domcontentloaded" })
  await page.getByLabel("Name").fill("Walkin Test")
  await page.getByLabel("Phone").fill("9000000001")
  await page.getByLabel("Age").fill("35")
  await page.getByLabel("Blood group").fill("O+")
  await page.getByRole("button", { name: /register as new patient/i }).click()

  await page.waitForTimeout(500)
  await page.getByRole("button", { name: /next/i }).click()

  await page.getByLabel("Chief complaint").fill("Severe chest pain")
  await page.getByLabel("SpO2").fill("88")
  await page.waitForTimeout(500)
  await page.getByRole("button", { name: /next/i }).click()

  // select first department and first doctor
  await page.locator("button:has-text('Cardiology')").first().click().catch(() => {})
  await page.locator("button").filter({ hasText: "General Medicine" }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.locator("button").filter({ hasText: "Dr." }).first().click()
  await page.getByRole("button", { name: /^next$/i }).click()

  await page.getByRole("button", { name: /generate token/i }).click()
  await page.waitForURL("**/receptionist/walkin", { timeout: 15000 })
  await page.getByText("Token Generated").waitFor()

  await browser.close()
  console.log("Sprint5 basic flow OK")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

