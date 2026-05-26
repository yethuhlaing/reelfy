'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Copy, Pencil, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  duplicateStoryApi,
  patchStoryMeta,
} from '@/features/stories/client/stories-client'
import type { DashboardStory, DashboardStoryStatus } from '@/shared/lib/types/dashboard'
import { getCategoryNavLabel } from '@/shared/lib/categories'

const STATUS_LABEL: Record<DashboardStoryStatus, string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  rendered: 'Rendered',
  failed: 'Failed',
}

const STATUS_COLOR: Record<DashboardStoryStatus, string> = {
  draft: 'var(--muted)',
  generating: 'var(--accent)',
  ready: 'var(--success)',
  rendered: 'var(--success)',
  failed: 'var(--danger)',
}

interface Props {
  summary: DashboardStory
  onChange: () => void
  onDelete: (storyId: string) => Promise<void>
}

export function StoryCard({ summary, onChange, onDelete }: Props) {
  const router = useRouter()
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(summary.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const thumb = summary.thumbnailUrl
  const status = summary.status
  const animated = summary.animatedCount
  const total = summary.sceneCount
  const updated = relativeTime(summary.lastUpdated)

  const open = () => router.push(`/${summary.category}/story/${summary.id}`)

  const handleRenameCommit = () => {
    const next = title.trim()
    if (next && next !== summary.title) {
      void patchStoryMeta(summary.id, { title: next }).then((ok) => {
        if (ok) onChange()
      })
    }
    setRenaming(false)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    void duplicateStoryApi(summary.id).then((id) => {
      if (id) {
        toast.success('Story duplicated')
        onChange()
      }
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(summary.id)
      setConfirmDelete(false)
      toast.success('Story deleted')
    } catch {
      toast.error('Delete failed', { description: 'Could not delete story. Try again.' })
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
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={summary.title} />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--accent)_30%,transparent),transparent_60%),linear-gradient(135deg,var(--surface2),var(--surface))] text-3xl text-[var(--muted)]">
              ◈
            </div>
          )}
          <div className="absolute left-2.5 top-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
              {STATUS_LABEL[status]}
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
                <DropdownMenuItem onSelect={() => setRenaming(true)}>
                  <Pencil size={14} /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDuplicate as never}>
                  <Copy size={14} /> Duplicate
                </DropdownMenuItem>
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
          {renaming ? (
            <input
              autoFocus
              className="truncate bg-transparent font-[var(--font-heading)] text-[0.95rem] font-semibold leading-[1.3] outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleRenameCommit}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameCommit()
                if (e.key === 'Escape') { setTitle(summary.title); setRenaming(false) }
              }}
              style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', outline: 'none' }}
            />
          ) : (
            <div className="truncate font-[var(--font-heading)] text-[0.95rem] font-semibold leading-[1.3]">{summary.title}</div>
          )}
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.72rem] text-[var(--muted)]">
            <span className="text-[var(--text)]">{getCategoryNavLabel(summary.category)}</span>
            <span>·</span>
            <span>{total} scenes</span>
            <span>·</span>
            <span>{animated} animated</span>
            <span>·</span>
            <span>{updated}</span>
          </div>
        </div>
      </article>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="gap-0 border-[var(--border)] bg-[var(--surface-solid)] p-0 shadow-2xl sm:max-w-md">
          <div className="space-y-4 px-6 pt-6 pb-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={18} />
              </div>
              <AlertDialogHeader className="gap-1 text-left">
                <AlertDialogTitle className="text-base">Delete "{summary.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the story, scenes, and generated assets.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-muted-foreground">
              This action cannot be undone.
            </div>
          </div>
          <AlertDialogFooter className="border-t border-[var(--border)] px-6 py-4">
            <AlertDialogCancel>Keep story</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              {deleting ? 'Deleting...' : 'Delete story'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function relativeTime(t: number): string {
  if (!t) return 'just now'
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
