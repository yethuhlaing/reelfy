'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { ModelMarginItem } from '@/lib/types/admin'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface MarginByModelProps {
  rows: ModelMarginItem[]
}

const chartConfig = {
  marginPct: { label: 'Margin %', color: 'var(--primary)' },
} satisfies ChartConfig

export function MarginByModel({ rows }: MarginByModelProps) {
  const data = rows.slice(0, 10).map((row) => ({
    key: `${row.provider}:${row.model}`,
    marginPct: row.marginPct,
  }))

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No model margin data yet.</p>
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="key"
          tickLine={false}
          axisLine={false}
          minTickGap={20}
          tickFormatter={(value: string) => value.split(':').slice(1).join(':')}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{item.payload.key}</span>
                  <span className="font-mono font-medium tabular-nums">{Number(value).toFixed(2)}%</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="marginPct" fill="var(--color-marginPct)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
