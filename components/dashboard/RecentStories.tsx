'use client'

import { useState } from 'react'
import type { StoredStorySummary } from '@/lib/storage'
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
} from '@/components/ui/alert-dialog'

interface RecentStoriesProps {
  stories: StoredStorySummary[]
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
    <div className="recent-stories">
      <h3 className="recent-stories-title">Recent stories</h3>
      <ul className="recent-stories-list">
        {stories.map((s) => (
          <li
            key={s.id}
            className={`recent-story-item ${s.id === currentStoryId ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            <div className="recent-story-main">
              <div className="recent-story-title">{s.title || 'Untitled'}</div>
              <div className="recent-story-tagline">{s.tagline}</div>
              <div className="recent-story-time">{timeAgo(s.savedAt)}</div>
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
                  className="recent-story-delete"
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
