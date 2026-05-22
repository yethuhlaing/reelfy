'use client'

import type { ModelBreakdownItem } from '@/lib/types/usage'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface ModelBreakdownProps {
  rows: ModelBreakdownItem[]
}

const chartConfig = {
  costUsd: {
    label: 'Cost (USD)',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

export function ModelBreakdown({ rows }: ModelBreakdownProps) {
  const data = rows.slice(0, 8).map((row) => ({
    label: `${row.provider}:${row.model}`,
    costUsd: Number(row.costUsd.toFixed(4)),
  }))

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No model usage yet.</p>
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={20}
          tickFormatter={(value: string) => value.split(':').slice(1).join(':')}
        />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{item.payload.label}</span>
                  <span className="font-mono font-medium tabular-nums">${Number(value).toFixed(4)}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="costUsd" radius={4} fill="var(--color-costUsd)" />
      </BarChart>
    </ChartContainer>
  )
}
