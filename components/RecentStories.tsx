'use client'

import type { StoredStorySummary } from '@/lib/storage'

interface RecentStoriesProps {
  stories: StoredStorySummary[]
  currentStoryId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
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
            <button
              className="recent-story-delete"
              aria-label="Delete story"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(s.id)
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
