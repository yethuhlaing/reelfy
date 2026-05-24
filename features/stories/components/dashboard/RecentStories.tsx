'use client'

import { useState } from 'react'
import type { DashboardStory } from '@/shared/lib/types/dashboard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

interface RecentStoriesProps {
  stories: DashboardStory[]
  currentStoryId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function RecentStories({ stories, currentStoryId, onSelect, onDelete }: RecentStoriesProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
      setOpenId(null)
    } finally {
      setDeletingId(null)
    }
  }

  if (stories.length === 0) return null

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-6">
      <h3 className="mb-3 font-[var(--font-heading)] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Recent stories</h3>
      <ul className="flex list-none flex-col gap-2">
        {stories.map((s) => (
          <li
            key={s.id}
            className={`relative flex cursor-pointer items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--accent)] hover:bg-[var(--surface2)] ${s.id === currentStoryId ? 'border-[var(--accent)] bg-[var(--surface2)]' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.85rem] font-semibold text-[var(--text)]">{s.title || 'Untitled'}</div>
              <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{s.tagline}</div>
              <div className="mt-1.5 text-[0.7rem] text-[var(--muted)]">{timeAgo(s.savedAt)}</div>
            </div>
            <AlertDialog
              open={openId === s.id}
              onOpenChange={(nextOpen) => {
                if (deletingId) return
                setOpenId(nextOpen ? s.id : null)
              }}
            >
              <AlertDialogTrigger asChild>
                <button
                  className="rounded border-0 bg-transparent px-1.5 py-0.5 text-[1.1rem] leading-none text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--text)]"
                  aria-label="Delete story"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  ×
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete story?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the story and all generated files (images, voiceovers,
                    animations, composed video). Cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingId === s.id}>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    disabled={deletingId === s.id}
                    onClick={(e) => {
                      e.preventDefault()
                      void handleDelete(s.id)
                    }}
                  >
                    {deletingId === s.id ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </div>
  )
}
