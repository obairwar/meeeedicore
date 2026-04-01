import { ComingSoonCards } from "@/components/shared/ComingSoonCards"

export default function NurseDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Nurse Dashboard</h1>
      <ComingSoonCards items={["Bed Management", "Patient Vitals"]} />
    </div>
  )
}

