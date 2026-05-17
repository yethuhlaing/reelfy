'use client'

import { Image as ImageIcon, Info } from 'lucide-react'
import { useWorkspace } from '@/context/workspace-context'
import { deriveWorkspaceActions } from '@/lib/states/workspace-state'
import { PlayAllBtn } from './actions/PlayAllBtn'
import { AnimateAllBtn } from './actions/AnimateAllBtn'
import { ExportBtn } from './actions/ExportBtn'
import { StopGenerationBtn } from './actions/StopGenerationBtn'
import { OverflowMenu } from '../layout/OverflowMenu'

interface Props {
  category: string
  onPlayAll: () => void
  onAnimateAll: () => void
  onStop: () => void
  onToggleThumbnail: () => void
  onToggleDetails: () => void
  onRenamed?: (title: string) => void
  thumbnailOpen?: boolean
}

export function WorkspaceTopBar({
  category,
  onPlayAll,
  onAnimateAll,
  onStop,
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
    <div className="ws-topbar">
      <div className="ws-title">
        <h1>{storyData?.title ?? 'Untitled story'}</h1>
        <p>{storyData?.tagline ?? ' '}</p>
      </div>

      {readOnly && <span className="chip" data-status="draft">Sample · read only</span>}

      <StopGenerationBtn state={actions.stopGeneration} onStop={onStop} />
      {actions.details.visible && (
        <button className="icon-btn" onClick={onToggleDetails} title="Generation details">
          <Info size={14} />
        </button>
      )}
      <PlayAllBtn state={actions.playAll} onClick={onPlayAll} />
      <AnimateAllBtn state={actions.animateAll} onConfirm={onAnimateAll} />
      <ExportBtn state={actions.export} storyId={storyId} scenes={storyData?.scenes ?? []} />
      <button
        className="icon-btn"
        onClick={onToggleThumbnail}
        disabled={actions.thumbnail.disabled}
        title="Thumbnail"
        style={thumbnailOpen ? { borderColor: 'var(--accent)' } : undefined}
      >
        <ImageIcon size={14} />
        {hasThumb && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
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
