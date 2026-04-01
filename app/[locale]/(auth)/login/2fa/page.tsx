import { Suspense } from "react"

import { TwoFactorClient } from "./TwoFactorClient"

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorClient />
    </Suspense>
  )
}
