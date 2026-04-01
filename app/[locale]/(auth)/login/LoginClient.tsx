"use client"

import { Link } from "@/i18n/navigation"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const roleTabs = ["Patient", "Doctor", "Staff", "Admin"] as const

export function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [roleTab, setRoleTab] = useState<(typeof roleTabs)[number]>("Patient")

  const registered = searchParams.get("registered") === "1"
  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") ?? "/dashboard", [searchParams])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  })

  useEffect(() => {
    const remembered = localStorage.getItem("hospital.rememberedEmail")
    if (remembered) form.setValue("email", remembered)
  }, [form])

  async function onSubmit(values: FormValues) {
    setAuthError(null)
    if (values.remember) localStorage.setItem("hospital.rememberedEmail", values.email)
    else localStorage.removeItem("hospital.rememberedEmail")

    const check = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, password: values.password }),
    })

    if (!check.ok) {
      if (check.status >= 500) {
        setAuthError("Server error — try again shortly or re-seed the database.")
        return
      }
      setAuthError("Invalid email or password.")
      return
    }

    const data = (await check.json()) as { needs2fa?: boolean; tempToken?: string }
    if (data.needs2fa && data.tempToken) {
      sessionStorage.setItem("hospital.2fa.tempToken", data.tempToken)
      const u = new URL("/login/2fa", window.location.origin)
      u.searchParams.set("callbackUrl", callbackUrl)
      u.searchParams.set("email", values.email)
      router.push(u.toString())
      return
    }

    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    })

    if (!res?.ok) {
      setAuthError("Invalid email or password.")
      return
    }

    router.replace(callbackUrl)
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div
        className="relative hidden min-h-[320px] flex-[1.15] flex-col justify-center overflow-hidden px-10 py-16 text-white lg:flex xl:px-16"
        style={{ background: "var(--grad-navy)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.12) 40px, rgba(255,255,255,0.12) 41px),
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.08) 40px, rgba(255,255,255,0.08) 41px)`,
          }}
        />
        <div className="relative z-[1] mx-auto max-w-lg text-center lg:text-left">
          <div className="mc-cross-pulse mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--mc-blue)] shadow-2xl shadow-blue-950/50 lg:mx-0">
            <span className="text-5xl font-light leading-none text-white">+</span>
          </div>
          <h1 className="mc-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">MediCore HMS</h1>
          <p className="mt-4 text-lg font-medium text-teal-300/95 xl:text-xl">Intelligent Healthcare, Seamlessly Delivered</p>
          <ul className="mt-10 space-y-3 text-left text-sm text-white/80">
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-teal-300">✓</span> Smart Queue Management
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-teal-300">✓</span> Real-time Patient Tracking
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-teal-300">✓</span> AI-Powered Diagnostics
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-white px-5 py-12 sm:px-10 lg:max-w-[560px] lg:flex-none xl:max-w-[640px]">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-medium text-[var(--mc-muted)]">Welcome back</p>
          <h2 className="mc-display mt-1 text-3xl font-bold tracking-tight text-[var(--mc-text)]">Sign in to MediCore</h2>

          <div className="mt-8 flex flex-wrap gap-2 rounded-2xl bg-[var(--mc-bg)] p-1.5">
            {roleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRoleTab(tab)}
                className={cn(
                  "flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold transition-all sm:text-sm",
                  roleTab === tab ? "bg-[var(--navy)] text-white shadow-md" : "text-[var(--mc-text-soft)] hover:text-[var(--mc-text)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {registered ? (
            <p className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Account created successfully. Please sign in.
            </p>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--mc-text)]">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mc-muted)]" />
                <Input
                  id="email"
                  className="h-12 rounded-xl border-[var(--mc-border)] pl-10 shadow-none focus-visible:ring-[var(--mc-blue)]"
                  placeholder="you@hospital.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email ? <p className="text-sm text-[var(--emergency)]">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-[var(--mc-text)]">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[var(--mc-blue)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-12 rounded-xl border-[var(--mc-border)] pr-11 shadow-none focus-visible:ring-[var(--mc-blue)]"
                  autoComplete="current-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mc-muted)] hover:text-[var(--mc-text)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? <p className="text-sm text-[var(--emergency)]">{errors.password.message}</p> : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--mc-text-soft)]">
              <Checkbox
                checked={watch("remember")}
                onCheckedChange={(v) => setValue("remember", Boolean(v))}
                className="border-[var(--mc-blue)] data-[state=checked]:bg-[var(--mc-blue)] data-[state=checked]:text-white"
              />
              Remember me
            </label>

            {authError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{authError}</p>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mc-btn-primary h-12 w-full rounded-xl text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25"
              style={{ background: "var(--grad-blue)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Signing in…</span>
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-[var(--mc-border)]" />
              <span className="text-xs font-medium text-[var(--mc-muted)]">or continue with</span>
              <div className="h-px flex-1 bg-[var(--mc-border)]" />
            </div>

            <p className="text-center text-sm text-[var(--mc-text-soft)]">
              New to MediCore?{" "}
              <Link href="/register" className="font-semibold text-[var(--mc-blue)] hover:underline">
                Create account →
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
