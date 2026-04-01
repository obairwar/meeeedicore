# Components

This folder contains reusable UI and feature components used across the MediCore HMS app.

## Structure
| Folder | Purpose |
|--------|---------|
| `ui` | Base UI primitives (buttons, cards, sheets, etc.) |
| `layout` | App shell and layout components |
| `shared` | Cross-cutting shared components/providers |
| `admin` | Admin-specific UI components |
| `lab` | Lab module UI components |
| `pharmacy` | Pharmacy module UI components |
| `receptionist` | Reception module UI components |
| `beds` | Bed/ward mapping UI components |

## Imports
Most folders include an `index.ts` barrel file, so you can import from:

```ts
import { Navbar, Sidebar } from "@/components/shared"
import { Button, Card } from "@/components/ui"
```

