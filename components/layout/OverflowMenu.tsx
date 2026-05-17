'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Pencil, Copy, Trash2, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteStory, duplicateStory, renameStory } from '@/lib/storage'

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

  const dup = () => {
    const id = duplicateStory(storyId)
    if (id) {
      toast.success('Duplicated')
      router.push(`/${category}/story/${id}`)
    }
  }

  const doDelete = async () => {
    try { await fetch(`/api/stories/${storyId}`, { method: 'DELETE' }) } catch { /* best-effort */ }
    deleteStory(storyId)
    toast.success('Story deleted')
    router.push('/dashboard')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="icon-btn" aria-label="More">
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
          <DropdownMenuItem disabled={readOnly} onSelect={dup}>
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
                  renameStory(storyId, t)
                  onRenamed?.(t)
                }
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the story and all generated assets.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
