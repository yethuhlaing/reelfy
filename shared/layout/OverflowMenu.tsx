'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Pencil, Copy, Trash2, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { duplicateStoryApi, patchStoryMeta } from '@/features/stories/client/stories-client'
import { storyHref } from '@/shared/lib/categories'

interface Props {
  storyId: string
  category: string
  title: string
  onRenamed?: (title: string) => void
  readOnly?: boolean
}

export function OverflowMenu({ storyId, category, title, onRenamed, readOnly }: Props) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const [delOpen, setDelOpen] = useState(false)

  const dup = async () => {
    const id = await duplicateStoryApi(storyId)
    if (id) {
      toast.success('Duplicated')
      router.push(storyHref(id))
    }
  }

  const doDelete = async () => {
    const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Delete failed')
      return
    }
    toast.success('Story deleted')
    router.push('/dashboard')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            aria-label="More"
          >
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
            <LayoutDashboard size={14} /> Open dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={readOnly} onSelect={() => setRenameOpen(true)}>
            <Pencil size={14} /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem disabled={readOnly} onSelect={() => void dup()}>
            <Copy size={14} /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={readOnly} onSelect={() => setDelOpen(true)} className="text-red-500">
            <Trash2 size={14} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename story</AlertDialogTitle>
          </AlertDialogHeader>
          <input
            value={newTitle}
            autoFocus
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2 rounded border bg-transparent"
            style={{ borderColor: 'var(--border)' }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const t = newTitle.trim()
                if (t) {
                  void patchStoryMeta(storyId, { title: t }).then((ok) => {
                    if (ok) onRenamed?.(t)
                  })
                }
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent className="gap-0 border-[var(--border)] bg-[var(--surface-solid)] p-0 shadow-2xl sm:max-w-md">
          <div className="space-y-4 px-6 pt-6 pb-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={18} />
              </div>
              <AlertDialogHeader className="gap-1 text-left">
                <AlertDialogTitle className="text-base">Delete "{title}"?</AlertDialogTitle>
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
              onClick={() => void doDelete()}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              Delete story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
