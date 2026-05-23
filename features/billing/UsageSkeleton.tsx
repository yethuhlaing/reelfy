import { Card, CardContent, CardHeader } from '@/features/ui/card'
import { Skeleton } from '@/features/ui/skeleton'

export function UsageStatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-3 py-5">
          <CardHeader className="px-5">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="px-5">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function UsageDetailsSkeleton() {
  return (
    <>
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="px-5">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="gap-4 py-5 xl:col-span-3">
          <CardHeader className="px-5">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="px-5">
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card className="gap-4 py-5 xl:col-span-2">
          <CardHeader className="px-5">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="px-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
