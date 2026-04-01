import { AdminMaintenanceKanban } from "@/components/admin/AdminMaintenanceKanban"

export default function AdminMaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
        <p className="text-slate-600 text-sm">Track facility issues across the hospital.</p>
      </div>
      <AdminMaintenanceKanban />
    </div>
  )
}
