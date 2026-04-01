"use client"

import { useRouter } from "@/i18n/navigation"
import { useSession } from "next-auth/react"
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
  location: z.string().min(1, "Location required"),
  description: z.string().min(1, "Describe the issue"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "EMERGENCY"]),
  photoUrl: z
    .string()
    .optional()
    .refine((s) => !s?.trim() || /^https?:\/\//.test(s.trim()), "Must be a valid URL"),
})

type FormValues = z.infer<typeof schema>

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/dashboard",
  DOCTOR: "/doctor/dashboard",
  NURSE: "/nurse/dashboard",
  RECEPTIONIST: "/receptionist/dashboard",
  PHARMACIST: "/pharmacist/dashboard",
  LAB_TECHNICIAN: "/lab/dashboard",
  ADMIN: "/admin/dashboard",
}

export default function MaintenanceNewPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [err, setErr] = useState<string | null>(null)
  const home = session?.user?.role ? ROLE_HOME[session.user.role] ?? "/dashboard" : "/dashboard"

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location: "", description: "", priority: "MEDIUM", photoUrl: "" },
  })

  async function onSubmit(values: FormValues) {
    setErr(null)
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: values.location,
        description: values.description,
        priority: values.priority,
        ...(values.photoUrl?.trim() ? { photoUrl: values.photoUrl.trim() } : {}),
      }),
    })
    const j = await res.json()
    if (!res.ok) {
      setErr(j.error ?? "Failed to submit")
      return
    }
    router.push(home)
  }

  return (
    <div className="mx-auto max-w-lg py-8 px-4">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Report maintenance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Facility issue</CardTitle>
          <CardDescription>Describe the issue and where it occurred.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="location">Location (floor / room)</Label>
              <Input id="location" {...form.register("location")} />
              {form.formState.errors.location ? (
                <p className="text-sm text-red-600">{form.formState.errors.location.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photoUrl">Photo URL (optional)</Label>
              <Input id="photoUrl" placeholder="https://..." {...form.register("photoUrl")} />
            </div>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(home)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
