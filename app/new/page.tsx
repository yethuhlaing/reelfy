import { Suspense } from 'react'
import { NewPageClient } from './_NewPageClient'

export default function NewPage() {
  return (
    <Suspense fallback={null}>
      <NewPageClient />
    </Suspense>
  )
}
