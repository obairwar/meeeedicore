import { SecuritySettingsForm } from "@/components/shared/SecuritySettingsForm"

export default function PatientSecurityPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Security</h1>
      <SecuritySettingsForm />
    </div>
  )
}
