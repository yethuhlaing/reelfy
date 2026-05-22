'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserSpendTable } from '@/components/admin/UserSpendTable'
import type { AdminUsersResponse } from '@/lib/types/admin'

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state')
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const query = state === 'unprofitable' ? '?state=unprofitable' : ''
    fetch(`/api/admin/users${query}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load admin users')
        return (await res.json()) as AdminUsersResponse
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [state])

  const title = state === 'unprofitable' ? 'Unprofitable Users' : 'User Spend'
  const description =
    state === 'unprofitable'
      ? 'Users with cumulative API cost higher than cumulative payments.'
      : 'Per-user profitability across revenue, API costs, and credits.'

  return (
    <>
      <TopBar
        title={title}
        right={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Back to admin</Link>
          </Button>
        }
      />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <UserSpendTable rows={data?.users ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
