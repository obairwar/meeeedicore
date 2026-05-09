## MediCore HMS (Hospital Management System)

MediCore is a full‑stack Hospital Management System built with **Next.js (App Router)**. It supports multi‑role workflows (Patient / Doctor / Receptionist / Lab / Pharmacy / Admin) with **appointments + token-based queueing**, **analytics & reporting**, optional **payments/notifications**, and **account security (2FA)**. It also includes an **Emergency SOS** flow to prioritize urgent patients in the queue.

## Highlights

- **Multi‑role dashboards**: Patient, Doctor, Receptionist, Lab, Pharmacy, Admin
- **Appointments & tokens**: booking + token generation
- **Live queue**: call-next flow + patient live status (Socket.io)
- **Triage & emergency**: emergency SOS + priority-based queue handling
- **Analytics**: overview dashboards (appointments, departments, revenue, demographics, top doctors)
- **Payments**: Razorpay integration (optional)
- **Notifications**: in‑app + email/SMS/WhatsApp + web push (optional)
- **Security**: Auth.js (NextAuth v5) + JWT sessions + TOTP 2FA + backup codes
- **PWA + i18n**: offline page + caching + locales (e.g. `en`, `ur`, `hi`)

## Tech stack

- **Next.js** 16 + **React** 19
- **Auth**: Auth.js / NextAuth (Credentials)
- **DB/ORM**: Prisma + SQLite
- **Validation**: Zod
- **Realtime**: Socket.io (+ PeerJS for video features)
- **UI**: Tailwind + component primitives

## Quickstart (local)

### 1) Install

```bash
npm install
```

### 2) Environment variables

Create `.env.local` (this file is gitignored). Minimum required for auth:

```bash
AUTH_SECRET=your_random_secret
DATABASE_URL="file:./dev.db"
```

You can generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

See `.env.example` for optional integrations (Razorpay, Twilio, Cloudinary, email, push).

### 3) Database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4) Run the app

```bash
npm run dev
```

App runs on the port shown in the terminal (often `http://localhost:7771` in dev).

### 5) (Optional) Run realtime server (live queue)

Open a second terminal:

```bash
npm run dev:socket
```

This starts Socket.io (default `http://127.0.0.1:3001`).

## Demo accounts (seed)

From `prisma/README.md`:

- **Admin**: `admin@hospital.com` / `Admin@123`
- **Doctor**: `doctor1@hospital.com` / `Doctor@123`
- **Receptionist**: `reception@hospital.com` / `Recept@123`
- **Patient**: `ahmad.mir@test.com` / `Test@1234`

## Repo structure (high level)

- `app/`: pages (role‑based routes) + API routes
- `components/`: UI + feature components
- `lib/`: shared services (auth, queue logic, notifications, prisma)
- `prisma/`: schema, migrations, seed
- `server/`: Socket.io + PeerJS server

## Notes for deployment

- Set **`AUTH_SECRET`** in production environment.
- Configure DB (`DATABASE_URL`) and any optional providers you need (Razorpay/Twilio/Cloudinary/email/push).
