'use client'

import { Image as ImageIcon, Info, Mic } from 'lucide-react'
import { useWorkspace } from '@/features/workspace/context/workspace-context'
import { deriveWorkspaceActions } from '@/features/workspace/lib/workspace-state'
import { AnimateAllBtn } from './actions/AnimateAllBtn'
import { ExportBtn } from './actions/ExportBtn'

interface Props {
  onAnimateAll: () => void
  onToggleThumbnail: () => void
  onToggleVoice: () => void
  onToggleDetails: () => void
  thumbnailOpen?: boolean
  voiceOpen?: boolean
}

// Quiet segment inside the tool cluster. No own border — the cluster owns it.
function ToolSegment({
  active,
  hasValue,
  disabled,
  onClick,
  title,
  icon: Icon,
  label,
}: {
  active?: boolean
  hasValue?: boolean
  disabled?: boolean
  onClick?: () => void
  title: string
  icon: typeof Info
  label: string
}) {
  return (
    <button
      className={`inline-flex h-[30px] min-w-[30px] items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? 'bg-[var(--surface2)] text-[var(--text)]'
          : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Icon size={14} className={hasValue ? 'text-[var(--accent)]' : undefined} />
      <span className="max-md:hidden">{label}</span>
    </button>
  )
}

export function WorkspaceTopBar({
  onAnimateAll,
  onToggleThumbnail,
  onToggleVoice,
  onToggleDetails,
  thumbnailOpen,
  voiceOpen,
}: Props) {
  const { storyData, storyId, isGenerating, playState, readOnly, options } = useWorkspace()
  const actions = deriveWorkspaceActions(
    storyData,
    isGenerating,
    playState.isPlaying,
    false,
    readOnly,
  )
  const hasThumb = !!storyData?.thumbnailUrl
  const showVoice = !!storyId && !readOnly
  const showTools = showVoice || actions.thumbnail.visible || actions.details.visible

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] px-5 py-3 backdrop-blur-md max-md:flex-wrap max-md:gap-2">
      {/* Zone 1 — identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate whitespace-nowrap font-[var(--font-heading)] text-base font-semibold">{storyData?.title ?? 'Untitled story'}</h1>
          {readOnly && <span className="shrink-0 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--muted)]">Read only</span>}
        </div>
        <p className="truncate whitespace-nowrap text-xs text-[var(--muted)] max-md:hidden">{storyData?.tagline ?? ' '}</p>
      </div>

      {/* Zone 2 — tools (quiet segmented cluster) */}
      {showTools && (
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface2)_40%,transparent)] p-0.5">
          {showVoice && (
            <ToolSegment
              active={voiceOpen}
              hasValue={!!options?.voiceId}
              disabled={playState.isPlaying}
              onClick={onToggleVoice}
              title="Voice"
              icon={Mic}
              label="Voice"
            />
          )}
          {actions.thumbnail.visible && (
            <ToolSegment
              active={thumbnailOpen}
              hasValue={hasThumb}
              disabled={actions.thumbnail.disabled}
              onClick={onToggleThumbnail}
              title="Thumbnail"
              icon={ImageIcon}
              label="Thumbnail"
            />
          )}
          {actions.details.visible && (
            <ToolSegment
              onClick={onToggleDetails}
              title="Generation details"
              icon={Info}
              label="Details"
            />
          )}
        </div>
      )}

      {/* Zone 3 — flow (Animate secondary, Export = single CTA) */}
      <div className="flex items-center gap-2">
        <AnimateAllBtn state={actions.animateAll} onConfirm={onAnimateAll} />
        <ExportBtn state={actions.export} storyId={storyId} scenes={storyData?.scenes ?? []} />
      </div>
    </div>
  )
}
