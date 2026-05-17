'use client'

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { StoryData, Scene, GenerateOptions } from '../lib/types'
import { updateStoryScene } from '../lib/storage'

export interface PlayState {
  isPlaying: boolean
  currentIndex: number
}

export interface WorkspaceCtx {
  storyId: string | null
  storyData: StoryData | null
  setStoryData: (
    updater: StoryData | null | ((prev: StoryData | null) => StoryData | null),
  ) => void
  options: GenerateOptions | null
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
  readOnly: boolean
  playState: PlayState
  setPlayState: (s: PlayState) => void
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  patchScene: (sceneId: string, patch: Partial<Scene>) => void
  activeSceneId: string | null
  setActiveSceneId: (id: string | null) => void
  playScene?: (index: number) => Promise<void> | void
  enqueueAnimate?: (sceneId: string) => Promise<void> | void
  retryVoice?: (sceneId: string) => Promise<void> | void
  retryImage?: (sceneId: string) => Promise<void> | void
}

const Ctx = createContext<WorkspaceCtx | null>(null)

interface ProviderProps {
  storyId: string | null
  storyData: StoryData | null
  setStoryData: WorkspaceCtx['setStoryData']
  options: GenerateOptions | null
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
  readOnly?: boolean
  playState: PlayState
  setPlayState: (s: PlayState) => void
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  playScene?: WorkspaceCtx['playScene']
  enqueueAnimate?: WorkspaceCtx['enqueueAnimate']
  retryVoice?: WorkspaceCtx['retryVoice']
  retryImage?: WorkspaceCtx['retryImage']
  children: ReactNode
}

export function WorkspaceProvider({
  storyId,
  storyData,
  setStoryData,
  options,
  isGenerating,
  setIsGenerating,
  readOnly = false,
  playState,
  setPlayState,
  audioRef,
  playScene,
  enqueueAnimate,
  retryVoice,
  retryImage,
  children,
}: ProviderProps) {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)

  const patchScene = useCallback(
    (sceneId: string, patch: Partial<Scene>) => {
      setStoryData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
            }
          : prev,
      )
      if (storyId && !readOnly) updateStoryScene(storyId, sceneId, patch)
    },
    [storyId, setStoryData, readOnly],
  )

  return (
    <Ctx.Provider
      value={{
        storyId,
        storyData,
        setStoryData,
        options,
        isGenerating,
        setIsGenerating,
        readOnly,
        playState,
        setPlayState,
        audioRef,
        patchScene,
        activeSceneId,
        setActiveSceneId,
        playScene,
        enqueueAnimate,
        retryVoice,
        retryImage,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useWorkspace(): WorkspaceCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace must be inside <WorkspaceProvider>')
  return v
}
