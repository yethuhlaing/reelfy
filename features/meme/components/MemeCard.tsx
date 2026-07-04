'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { memeHref } from '@/shared/lib/categories'
import type { DashboardMeme } from '@/shared/lib/types/dashboard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

interface Props {
  meme: DashboardMeme
  onDelete: (memeId: string) => Promise<void>
}

export function MemeCard({ meme, onDelete }: Props) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const title = memeTitle(meme.inputText)

  const open = () => router.push(memeHref(meme.id))

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(meme.id)
      setConfirmDelete(false)
      toast.success('Meme deleted')
    } catch {
      toast.error('Delete failed', { description: 'Could not delete meme. Try again.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <article
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.35)]"
        onClick={open}
      >
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-[var(--surface2)] ring-1 ring-inset ring-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meme.previewUrl} alt={title} className="h-full w-full object-contain" />
          <div className="absolute left-2.5 top-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              😂 Meme
            </span>
          </div>
          <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] p-0 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
                  aria-label="More"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={open}>
                  <Download size={14} /> Open & export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-500">
                  <Trash2 size={14} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
          <div className="truncate font-[var(--font-heading)] text-[0.95rem] font-semibold leading-[1.3]">{title}</div>
          <div className="text-[0.72rem] text-[var(--muted)]">
            {meme.variantCount} variants · {relativeTime(meme.createdAt)}
          </div>
        </div>
      </article>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="gap-0 border-[var(--border)] bg-[var(--surface-solid)] p-0 shadow-2xl sm:max-w-md">
          <div className="space-y-4 px-6 pt-6 pb-5">
            <AlertDialogHeader className="gap-1 text-left">
              <AlertDialogTitle className="text-base">Delete this meme set?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove all {meme.variantCount} variants for this prompt.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="border-t border-[var(--border)] px-6 py-4">
            <AlertDialogCancel>Keep meme</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              {deleting ? 'Deleting...' : 'Delete meme'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function memeTitle(inputText: string): string {
  const trimmed = inputText.trim()
  if (!trimmed) return 'Meme'
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed
}

function relativeTime(t: number): string {
  if (!t) return 'just now'
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
