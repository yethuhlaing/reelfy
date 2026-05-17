import type { StoryData } from '../types'

export interface ActionState {
  visible: boolean
  disabled: boolean
  label?: string
}

export interface WorkspaceActions {
  playAll: ActionState
  animateAll: ActionState
  export: ActionState
  thumbnail: ActionState
  details: ActionState
}

export function deriveWorkspaceActions(
  storyData: StoryData | null,
  isGenerating: boolean,
  playing: boolean,
  exporting = false,
  readOnly = false,
): WorkspaceActions {
  const scenes = storyData?.scenes ?? []
  const animatable = scenes.filter((s) => s.imageUrl && s.motionPrompt && !s.videoUrl)
  const pending = scenes.filter((s) => !!s.pendingJobId)
  const done = scenes.filter((s) => !!s.videoUrl).length
  const total = scenes.filter((s) => s.imageUrl && s.motionPrompt).length
  const anyVideoReady = scenes.some((s) => !!s.videoUrl)
  const nothingPlayable = scenes.length === 0

  return {
    playAll: {
      visible: scenes.length > 0,
      disabled: readOnly || nothingPlayable || playing,
    },
    animateAll: {
      visible: !isGenerating && animatable.length > 0,
      disabled: readOnly || animatable.length === 0,
      label:
        pending.length > 0
          ? `Animating ${done}/${total}…`
          : `Animate All (${animatable.length})`,
    },
    export: {
      visible: anyVideoReady,
      disabled: readOnly || exporting,
    },
    thumbnail: {
      visible: true,
      disabled: readOnly || !storyData,
    },
    details: {
      visible: isGenerating,
      disabled: false,
    },
  }
}
