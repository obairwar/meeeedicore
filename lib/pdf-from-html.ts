import puppeteer from "puppeteer"

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const buf = await page.pdf({ format: "A4", printBackground: true })
    return Buffer.from(buf)
  } finally {
    await browser.close()
  }
}
