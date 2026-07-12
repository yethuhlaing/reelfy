'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Download, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { brainrotHref } from '@/shared/lib/categories'
import type { DashboardBrainrot } from '@/shared/lib/types/dashboard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

// Map raw project status (incl. stray provider values like 'terminated') to a
// friendly label + tone. Anything unrecognised reads as a failure, not raw text.
function statusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'complete':
      return { label: 'Ready', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' }
    case 'rendering':
      return { label: 'Rendering', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' }
    case 'draft':
    case 'script_ready':
      return { label: 'Draft', className: 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]' }
    default:
      return { label: 'Failed', className: 'border-red-500/40 bg-red-500/10 text-red-400' }
  }
}

function StatusPill({ status }: { status: string }) {
  const { label, className } = statusMeta(status)
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${className}`}>
      {label}
    </span>
  )
}

export function BrainrotCard({
  brainrot,
  onDelete,
}: {
  brainrot: DashboardBrainrot
  onDelete: (id: string) => Promise<void>
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const open = () => router.push(brainrotHref(brainrot.id))

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(brainrot.id)
      setConfirmDelete(false)
      toast.success('Reel deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <article
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:border-[var(--border-strong)]"
        onClick={open}
      >
        <div className="relative aspect-video overflow-hidden bg-black">
          {brainrot.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <video
              src={brainrot.previewUrl}
              muted
              playsInline
              className="h-full w-full object-contain"
              onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => {
                e.currentTarget.pause()
                e.currentTarget.currentTime = 0
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">
              {brainrot.status === 'rendering'
                ? 'Rendering…'
                : brainrot.status === 'failed'
                  ? 'Failed'
                  : 'No preview'}
            </div>
          )}
          <div className="absolute left-2.5 top-2.5">
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              ▶ Brainrot
            </span>
          </div>
          <div
            className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)]"
                  aria-label="More"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={open}>
                  <Download size={14} /> Open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-500">
                  <Trash2 size={14} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0 flex-1 truncate font-semibold">{brainrot.title}</div>
          <StatusPill status={brainrot.status} />
        </div>
      </article>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reel?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
