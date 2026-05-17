'use client'

import { Image as ImageIcon, Info } from 'lucide-react'
import { useWorkspace } from '@/context/workspace-context'
import { deriveWorkspaceActions } from '@/lib/states/workspace-state'
import { PlayAllBtn } from './actions/PlayAllBtn'
import { AnimateAllBtn } from './actions/AnimateAllBtn'
import { ExportBtn } from './actions/ExportBtn'
import { OverflowMenu } from '../layout/OverflowMenu'

interface Props {
  category: string
  onPlayAll: () => void
  onAnimateAll: () => void
  onToggleThumbnail: () => void
  onToggleDetails: () => void
  onRenamed?: (title: string) => void
  thumbnailOpen?: boolean
}

export function WorkspaceTopBar({
  category,
  onPlayAll,
  onAnimateAll,
  onToggleThumbnail,
  onToggleDetails,
  onRenamed,
  thumbnailOpen,
}: Props) {
  const { storyData, storyId, isGenerating, playState, readOnly } = useWorkspace()
  const actions = deriveWorkspaceActions(
    storyData,
    isGenerating,
    playState.isPlaying,
    false,
    readOnly,
  )
  const hasThumb = !!storyData?.thumbnailUrl

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] px-5 py-3 backdrop-blur-md max-md:flex-wrap max-md:gap-1.5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate whitespace-nowrap font-[var(--font-heading)] text-base font-semibold">{storyData?.title ?? 'Untitled story'}</h1>
        <p className="truncate whitespace-nowrap text-xs text-[var(--muted)] max-md:hidden">{storyData?.tagline ?? ' '}</p>
      </div>

      {readOnly && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--muted)]">Sample · read only</span>}

      {actions.details.visible && (
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
          onClick={onToggleDetails}
          title="Generation details"
        >
          <Info size={14} />
        </button>
      )}
      <PlayAllBtn state={actions.playAll} onClick={onPlayAll} />
      <AnimateAllBtn state={actions.animateAll} onConfirm={onAnimateAll} />
      <ExportBtn state={actions.export} storyId={storyId} scenes={storyData?.scenes ?? []} />
      <button
        className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
        onClick={onToggleThumbnail}
        disabled={actions.thumbnail.disabled}
        title="Thumbnail"
        style={thumbnailOpen ? { borderColor: 'var(--accent)' } : undefined}
      >
        <ImageIcon size={14} />
        {hasThumb && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
      </button>
      {storyId && (
        <OverflowMenu
          storyId={storyId}
          category={category}
          title={storyData?.title ?? ''}
          onRenamed={onRenamed}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}
