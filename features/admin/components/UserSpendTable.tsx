'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { AdminUserSpendRow } from '@/features/admin/types/admin'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

interface UserSpendTableProps {
  rows: AdminUserSpendRow[]
}

export function UserSpendTable({ rows }: UserSpendTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">API cost</TableHead>
          <TableHead className="text-right">Margin</TableHead>
          <TableHead className="text-right">Credits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
              No user spend data yet.
            </TableCell>
          </TableRow>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((row, index) => (
              <motion.tr
                key={row.userId}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -48 }}
                transition={{ duration: 0.35, delay: index * 0.04, ease: 'easeOut' }}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <TableCell className="max-w-[300px]">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name || row.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                    </div>
                    {row.isUnprofitable ? <Badge variant="destructive">Unprofitable</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  ${row.revenueUsd.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  ${row.apiCostUsd.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.marginUsd >= 0 ? '+' : ''}
                  {row.marginUsd.toFixed(4)} ({row.marginPct.toFixed(2)}%)
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.totalCreditsCharged}/{row.totalCreditsPurchased}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        )}
      </TableBody>
    </Table>
  )
}
