'use client'

import type { UsageStoryItem } from '@/lib/types/usage'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UsageTableProps {
  rows: UsageStoryItem[]
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})

export function UsageTable({ rows }: UsageTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Story</TableHead>
          <TableHead>Model combo</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead className="text-right">API cost</TableHead>
          <TableHead className="text-right">Last used</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
              No usage yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.storyId ?? `general-${row.lastUsedAt}`}>
              <TableCell className="max-w-[260px] truncate font-medium">{row.storyTitle}</TableCell>
              <TableCell className="max-w-[420px] truncate">
                {row.modelCombo ? <Badge variant="outline">{row.modelCombo}</Badge> : '—'}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.creditsCharged}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">${row.costUsd.toFixed(4)}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {dateFormatter.format(new Date(row.lastUsedAt))}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
