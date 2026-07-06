import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="px-5">
          <Skeleton className="h-10 w-full max-w-xs" />
        </CardContent>
      </Card>

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

      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-4 py-5">
          <CardHeader className="px-5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="px-5">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
