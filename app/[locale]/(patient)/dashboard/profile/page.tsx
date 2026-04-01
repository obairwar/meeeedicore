"use client"

import { useCallback, useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AvatarImage } from "@/components/shared/AvatarImage"
import { toastError, toastSuccess } from "@/lib/toast-api"

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  dateOfBirth: string | null
  gender: string | null
  bloodGroup: string | null
  photoUrl: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  preferredLanguage: string | null
  notifyWhatsApp: boolean
  notifySms: boolean
  notifyEmail: boolean
}

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [photoUploading, setPhotoUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/patient/profile")
    const j = await res.json()
    if (res.ok) {
      setProfile(j)
      setForm(j)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch("/api/patient/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        preferredLanguage: form.preferredLanguage,
        notifyWhatsApp: form.notifyWhatsApp,
        notifySms: form.notifySms,
        notifyEmail: form.notifyEmail,
        ...(currentPassword && newPassword
          ? { currentPassword, newPassword }
          : {}),
      }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) {
      const err = j.error ?? "Save failed"
      setMsg(err)
      toastError(err)
      return
    }
    setMsg("Saved")
    toastSuccess("Profile saved")
    setCurrentPassword("")
    setNewPassword("")
    void load()
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/patient/profile/photo", { method: "POST", body: fd })
    void load()
    setPhotoUploading(false)
    if (!res.ok) {
      setMsg("Photo upload failed")
      toastError("Photo upload failed")
    } else {
      toastSuccess("Photo updated")
    }
  }

  async function deleteAccount() {
    if (!confirm("Deactivate your account? You will need admin support to recover.")) return
    const res = await fetch("/api/patient/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deleteAccount: true }),
    })
    if (res.ok) await signOut({ callbackUrl: "/login" })
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-600">Personal details, security, and notifications.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0">
          {profile.photoUrl ? (
            <AvatarImage src={profile.photoUrl} alt="Profile photo" size={80} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-500">{profile.name[0]}</div>
          )}
        </div>
        <div>
          <Label htmlFor="photo">Profile photo</Label>
          <Input id="photo" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1" onChange={onPhoto} disabled={photoUploading} />
          {photoUploading ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : null}
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-4 rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={profile.email} disabled className="bg-slate-50" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="address">Address</Label>
          <textarea
            id="address"
            className="w-full min-h-20 rounded-md border bg-white p-2 text-sm"
            value={form.address ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth?.slice(0, 10) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value || null }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bg">Blood group</Label>
            <Input id="bg" value={form.bloodGroup ?? ""} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="lang">Preferred language</Label>
          <Input
            id="lang"
            placeholder="en, hi, …"
            value={form.preferredLanguage ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Emergency contact</Label>
          <Input
            placeholder="Name"
            value={form.emergencyContactName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
          />
          <Input
            className="mt-3"
            placeholder="Phone"
            value={form.emergencyContactPhone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="font-medium text-slate-900">Notifications</div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.notifyWhatsApp ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f, notifyWhatsApp: Boolean(v) }))}
            />
            WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.notifySms ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f, notifySms: Boolean(v) }))}
            />
            SMS
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.notifyEmail ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f, notifyEmail: Boolean(v) }))}
            />
            Email
          </label>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="font-medium text-slate-900">Change password</div>
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

        <Button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </form>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <div className="font-medium text-red-900">Danger zone</div>
        <p className="text-sm text-red-800">Soft-delete your account (sets inactive).</p>
        <Button variant="outline" className="border-red-300 text-red-800" type="button" onClick={() => void deleteAccount()}>
          Delete account
        </Button>
      </div>
    </div>
  )
}
