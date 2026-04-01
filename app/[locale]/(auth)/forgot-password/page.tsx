"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: FormValues) {
    // Mock for now; wire email later
    console.log("Password reset requested for:", values.email)
    setSent(true)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form

  return (
    <Card className="w-full max-w-md border-sky-100 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-slate-900">Reset password</CardTitle>
        <CardDescription className="text-slate-600">
          Enter your email and we’ll send a reset link (mocked for now).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          {sent ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              If an account exists, a reset link has been sent.
            </p>
          ) : null}

          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className={isSubmitting ? "ml-2" : ""}>Send reset link</span>
          </Button>

          <p className="text-sm text-slate-600 text-center">
            Back to{" "}
            <Link className="text-sky-700 hover:underline" href="/login">
              login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

