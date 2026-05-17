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
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  deleteStory,
  duplicateStory,
  renameStory,
  getStory,
  getStorySummary,
  type StoredStorySummary,
  type StoryStatus,
} from '@/lib/storage'

const STATUS_LABEL: Record<StoryStatus, string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  rendered: 'Rendered',
  failed: 'Failed',
}

interface Props {
  summary: StoredStorySummary
  onChange: () => void
}

export function StoryCard({ summary, onChange }: Props) {
  const router = useRouter()
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(summary.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const story = getStory(summary.id)
  const det = getStorySummary(summary.id)
  const thumb = story?.storyData.thumbnailUrl ?? story?.storyData.scenes.find((s) => s.imageUrl)?.imageUrl ?? null
  const status: StoryStatus = summary.status ?? det?.status ?? 'draft'
  const animated = det?.animatedCount ?? 0
  const total = det?.sceneCount ?? 0
  const updated = relativeTime(summary.lastUpdated ?? summary.savedAt)

  const open = () => router.push(`/${summary.category}/story/${summary.id}`)

  const handleRenameCommit = () => {
    const next = title.trim()
    if (next && next !== summary.title) {
      renameStory(summary.id, next)
      onChange()
    }
    setRenaming(false)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const id = duplicateStory(summary.id)
    if (id) {
      toast.success('Story duplicated')
      onChange()
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/stories/${summary.id}`, { method: 'DELETE' })
    } catch {
      /* best-effort cleanup */
    }
    deleteStory(summary.id)
    toast.success('Story deleted')
    onChange()
  }

  return (
    <>
      <article className="story-card" onClick={open}>
        <div className="story-card-thumb">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={summary.title} />
          ) : (
            <div className="story-card-thumb-fallback">◈</div>
          )}
          <div className="story-card-status">
            <span className="chip" data-status={status}>{STATUS_LABEL[status]}</span>
          </div>
          <div className="story-card-menu" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="icon-btn" aria-label="More" style={{ height: 28, width: 28, padding: 0 }}>
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
        <div className="story-card-body">
          {renaming ? (
            <input
              autoFocus
              className="story-card-title"
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
            <div className="story-card-title">{summary.title}</div>
          )}
          <div className="story-card-meta">
            <span>{total} scenes</span>
            <span>·</span>
            <span>{animated} animated</span>
            <span>·</span>
            <span>{updated}</span>
          </div>
        </div>
      </article>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{summary.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the story and its generated assets. Can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
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
