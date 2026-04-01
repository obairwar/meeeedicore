import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  await params
  const t = await getTranslations("home")

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white p-6">
      <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
            <p className="text-slate-600">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700"
          >
            {t("login")}
          </Link>
          <Link
            href="/register"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            {t("register")}
          </Link>
        </div>

        <p className="text-sm text-slate-600">{t("afterLogin")}</p>
      </div>
    </div>
  )
}
