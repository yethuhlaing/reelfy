import { Card, CardContent, CardHeader } from '@/features/ui/card'
import { Skeleton } from '@/features/ui/skeleton'

export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="gap-3 py-5">
            <CardHeader className="px-5">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="px-5">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="px-5">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="gap-4 py-5 xl:col-span-3">
          <CardHeader className="px-5">
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="px-5">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="gap-4 py-5 xl:col-span-2">
          <CardHeader className="px-5">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="px-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
