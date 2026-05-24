'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin page error:', error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Admin dashboard failed to load</CardTitle>
          <CardDescription>
            A server error occurred while loading admin data. Try again or return to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 px-5">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
