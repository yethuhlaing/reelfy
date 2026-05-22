import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingAdminUsersPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="px-5 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
