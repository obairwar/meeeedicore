"use client"

import { Link, useRouter } from "@/i18n/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const bloodOptions = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

const step1Schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone is required"),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().min(1, "Select blood group"),
  city: z.string().min(1, "City is required"),
})

const fullSchema = step1Schema.extend({
  address: z.string().min(5, "Address is required"),
  emergencyContactName: z.string().min(2, "Required"),
  emergencyContactPhone: z.string().min(10, "Required"),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password"),
  terms: z.boolean().refine((v) => v === true, { message: "Accept terms to continue" }),
})

type FullValues = z.infer<typeof fullSchema>

function passwordStrength(pw: string): { level: number; label: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  const level = Math.min(4, score)
  const labels = ["Weak", "Fair", "Good", "Strong"]
  return { level, label: labels[Math.max(0, level - 1)] ?? "Weak" }
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FullValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "MALE",
      bloodGroup: "",
      city: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const pw = form.watch("password") ?? ""
  const strength = useMemo(() => passwordStrength(pw), [pw])

  function applyZodErrors(err: z.ZodError) {
    for (const issue of err.issues) {
      const path = issue.path[0] as keyof FullValues | undefined
      if (path) form.setError(path, { message: issue.message })
    }
  }

  async function submitAll(values: FullValues) {
    setServerError(null)
    const parsed = fullSchema.safeParse(values)
    if (!parsed.success) {
      applyZodErrors(parsed.error)
      return
    }
    if (parsed.data.password !== parsed.data.confirmPassword) {
      form.setError("confirmPassword", { message: "Passwords do not match" })
      return
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        bloodGroup: parsed.data.bloodGroup,
        city: parsed.data.city,
        address: parsed.data.address,
        emergencyContactName: parsed.data.emergencyContactName,
        emergencyContactPhone: parsed.data.emergencyContactPhone,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setServerError(body?.error ?? "Registration failed")
      return
    }
    router.replace("/login?registered=1")
  }

  function nextFromStep1() {
    form.clearErrors()
    const v = form.getValues()
    const parsed = step1Schema.safeParse({
      name: v.name,
      email: v.email,
      phone: v.phone,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      bloodGroup: v.bloodGroup,
      city: v.city,
    })
    if (!parsed.success) {
      applyZodErrors(parsed.error)
      return
    }
    setStep(2)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-[var(--mc-border)]">
            <div
              className="h-full rounded-full bg-[var(--mc-blue)] transition-all duration-500 ease-out"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
          <p className="text-right text-xs font-medium text-[var(--mc-muted)]">{step} of 2</p>
        </div>

        {step === 1 ? (
          <>
            <h1 className="mc-display text-2xl font-bold text-[var(--mc-text)]">Create your account</h1>
            <p className="mt-1 text-sm text-[var(--mc-text-soft)]">Personal details — step 1 of 2</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full name</Label>
                <Input className="h-11 rounded-xl" {...register("name")} />
                {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="h-11 rounded-xl" type="email" {...register("email")} />
                {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input className="h-11 rounded-xl" {...register("phone")} />
                {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input className="h-11 rounded-xl" type="date" {...register("dateOfBirth")} />
                {errors.dateOfBirth ? <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--mc-border)] bg-white px-3 text-sm"
                  {...register("gender")}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Blood group</Label>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--mc-border)] bg-white px-3 text-sm"
                  {...register("bloodGroup")}
                >
                  <option value="">Select</option>
                  {bloodOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.bloodGroup ? <p className="text-sm text-red-600">{errors.bloodGroup.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input className="h-11 rounded-xl" {...register("city")} />
                {errors.city ? <p className="text-sm text-red-600">{errors.city.message}</p> : null}
              </div>
            </div>
            <Button
              type="button"
              className="mc-btn-primary mt-8 h-12 w-full rounded-xl font-semibold text-white"
              style={{ background: "var(--grad-blue)" }}
              onClick={nextFromStep1}
            >
              Next step →
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit(submitAll)}>
            <h1 className="mc-display text-2xl font-bold text-[var(--mc-text)]">Secure your account</h1>
            <p className="mt-1 text-sm text-[var(--mc-text-soft)]">Step 2 of 2</p>

            <div className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-[var(--mc-border)] bg-white px-3 py-2 text-sm"
                  {...register("address")}
                />
                {errors.address ? <p className="text-sm text-red-600">{errors.address.message}</p> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Emergency contact name</Label>
                  <Input className="h-11 rounded-xl" {...register("emergencyContactName")} />
                  {errors.emergencyContactName ? <p className="text-sm text-red-600">{errors.emergencyContactName.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Emergency contact phone</Label>
                  <Input className="h-11 rounded-xl" {...register("emergencyContactPhone")} />
                  {errors.emergencyContactPhone ? (
                    <p className="text-sm text-red-600">{errors.emergencyContactPhone.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input className="h-12 rounded-xl" type="password" autoComplete="new-password" {...register("password")} />
                <div className="flex gap-1 pt-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        strength.level > i
                          ? i === 0
                            ? "bg-red-500"
                            : i === 1
                              ? "bg-orange-400"
                              : i === 2
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          : "bg-[var(--mc-border)]"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-[var(--mc-muted)]">
                  Strength: <span className="font-semibold text-[var(--mc-text)]">{strength.label}</span>
                </p>
                {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input className="h-12 rounded-xl" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                {errors.confirmPassword ? <p className="text-sm text-red-600">{errors.confirmPassword.message}</p> : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--mc-text-soft)]">
                <Checkbox checked={!!watch("terms")} onCheckedChange={(v) => setValue("terms", Boolean(v))} className="mt-0.5" />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>
              {errors.terms ? <p className="text-sm text-red-600">{errors.terms.message}</p> : null}

              {serverError ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{serverError}</p> : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mc-btn-primary h-12 flex-1 rounded-xl font-semibold text-white sm:ml-auto"
                  style={{ background: "var(--grad-teal)" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Creating…</span>
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-[var(--mc-text-soft)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--mc-blue)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
