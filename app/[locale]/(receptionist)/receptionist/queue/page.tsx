import { redirect } from "@/i18n/navigation"

/** Legacy URL: queue is managed from walk-in registration. */
export default async function ReceptionistQueueRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: "/receptionist/walkin", locale })
}
