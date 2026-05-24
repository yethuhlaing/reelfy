'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { RevenueCostPoint } from '@/features/admin/types/admin'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart'

interface CostRevenueChartProps {
  data: RevenueCostPoint[]
}

const chartConfig = {
  revenueUsd: { label: 'Revenue', color: 'var(--primary)' },
  costUsd: { label: 'API cost', color: 'var(--destructive)' },
} satisfies ChartConfig

export function CostRevenueChart({ data }: CostRevenueChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No billing activity yet.</p>
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="bucket" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="revenueUsd" stroke="var(--color-revenueUsd)" fill="var(--color-revenueUsd)" fillOpacity={0.18} />
        <Area type="monotone" dataKey="costUsd" stroke="var(--color-costUsd)" fill="var(--color-costUsd)" fillOpacity={0.18} />
      </AreaChart>
    </ChartContainer>
  )
}
