import type { ReactNode } from "react"
import {
  Activity,
  Bed,
  Bell,
  ClipboardList,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  Wrench,
} from "lucide-react"

export type Role =
  | "PATIENT"
  | "DOCTOR"
  | "NURSE"
  | "RECEPTIONIST"
  | "PHARMACIST"
  | "LAB_TECHNICIAN"
  | "ADMIN"

export type NavItem = {
  href: string
  /** Key under nav.* in messages */
  labelKey: string
  icon: ReactNode
}

export const navItemsByRole: Record<Role, NavItem[]> = {
  PATIENT: [
    { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/dashboard/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/dashboard/book", labelKey: "bookAppointment", icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/queue", labelKey: "myQueue", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/dashboard/records", labelKey: "medicalRecords", icon: <Activity className="h-4 w-4" /> },
    { href: "/dashboard/family", labelKey: "family", icon: <Users className="h-4 w-4" /> },
    { href: "/dashboard/payments", labelKey: "payments", icon: <CreditCard className="h-4 w-4" /> },
    { href: "/dashboard/profile", labelKey: "profile", icon: <Settings className="h-4 w-4" /> },
    { href: "/dashboard/profile/security", labelKey: "security", icon: <Shield className="h-4 w-4" /> },
  ],
  DOCTOR: [
    { href: "/doctor/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/doctor/queue", labelKey: "todaysQueue", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/doctor/schedule", labelKey: "schedule", icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/doctor/records", labelKey: "patientRecords", icon: <Activity className="h-4 w-4" /> },
    { href: "/doctor/video", labelKey: "videoConsults", icon: <Video className="h-4 w-4" /> },
    { href: "/doctor/profile/security", labelKey: "security", icon: <Shield className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
  NURSE: [
    { href: "/nurse/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/nurse/beds", labelKey: "bedManagement", icon: <Bed className="h-4 w-4" /> },
    { href: "/nurse/vitals", labelKey: "vitals", icon: <Activity className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
  RECEPTIONIST: [
    { href: "/receptionist/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/receptionist/walkin", labelKey: "walkin", icon: <Users className="h-4 w-4" /> },
    { href: "/receptionist/queue", labelKey: "queueControl", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/receptionist/beds", labelKey: "bedMap", icon: <Bed className="h-4 w-4" /> },
    { href: "/receptionist/visitors", labelKey: "visitors", icon: <Users className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
  PHARMACIST: [
    { href: "/pharmacist/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/pharmacist/prescriptions", labelKey: "prescriptions", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/pharmacist/inventory", labelKey: "inventory", icon: <Package className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
  LAB_TECHNICIAN: [
    { href: "/lab/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/lab/orders", labelKey: "labOrders", icon: <FlaskConical className="h-4 w-4" /> },
    { href: "/lab/results", labelKey: "labResults", icon: <Activity className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
  ADMIN: [
    { href: "/admin/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/admin/analytics", labelKey: "analytics", icon: <Activity className="h-4 w-4" /> },
    { href: "/admin/users", labelKey: "users", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/departments", labelKey: "departments", icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/admin/doctors", labelKey: "doctors", icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/admin/settings", labelKey: "settings", icon: <Settings className="h-4 w-4" /> },
    { href: "/admin/audit", labelKey: "audit", icon: <ShieldCheck className="h-4 w-4" /> },
    { href: "/admin/maintenance", labelKey: "maintenance", icon: <Wrench className="h-4 w-4" /> },
    { href: "/admin/profile/security", labelKey: "security", icon: <Shield className="h-4 w-4" /> },
    { href: "/maintenance/new", labelKey: "reportMaintenance", icon: <Wrench className="h-4 w-4" /> },
  ],
}
