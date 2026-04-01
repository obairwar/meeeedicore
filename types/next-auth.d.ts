import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role:
        | "PATIENT"
        | "DOCTOR"
        | "NURSE"
        | "RECEPTIONIST"
        | "PHARMACIST"
        | "LAB_TECHNICIAN"
        | "ADMIN"
    } & NonNullable<NextAuth.Session["user"]>
  }

  interface User {
    role:
      | "PATIENT"
      | "DOCTOR"
      | "NURSE"
      | "RECEPTIONIST"
      | "PHARMACIST"
      | "LAB_TECHNICIAN"
      | "ADMIN"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?:
      | "PATIENT"
      | "DOCTOR"
      | "NURSE"
      | "RECEPTIONIST"
      | "PHARMACIST"
      | "LAB_TECHNICIAN"
      | "ADMIN"
  }
}

