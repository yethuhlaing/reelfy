import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <Card className="py-5">
          <CardContent className="space-y-3 px-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-24" />
          </CardContent>
        </Card>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="py-5">
            <CardContent className="space-y-3 px-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="gap-3 py-4">
            <Skeleton className="mx-4 aspect-video rounded-lg" />
            <CardHeader className="px-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
