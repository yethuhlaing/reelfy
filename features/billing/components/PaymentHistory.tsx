'use client'

import type { PaymentHistoryItem } from '@/shared/lib/types/usage'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

interface PaymentHistoryProps {
  rows: PaymentHistoryItem[]
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})

export function PaymentHistory({ rows }: PaymentHistoryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Pack type</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
              No purchases yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-sm text-muted-foreground">
                {dateFormatter.format(new Date(row.createdAt))}
              </TableCell>
              <TableCell className="font-medium capitalize">{row.packType.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.creditsPurchased}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">${row.amountUsd.toFixed(2)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
