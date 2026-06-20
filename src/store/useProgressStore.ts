import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlayState } from '../engine/play'

export interface StoryProgress {
  visitedNodeIds: string[]
  discoveredEndingIds: string[]
  playCount: number
  lastPlayedAt: number
  savedPlay: PlayState | null
}

interface ProgressState {
  progress: Record<string, StoryProgress>
  recordVisit: (storyId: string, nodeId: string) => void
  recordEnding: (storyId: string, nodeId: string) => void
  recordPlayStart: (storyId: string) => void
  savePlayState: (storyId: string, playState: PlayState | null) => void
  clearProgress: (storyId: string) => void
  getProgress: (storyId: string) => StoryProgress
}

const emptyProgress: StoryProgress = {
  visitedNodeIds: [],
  discoveredEndingIds: [],
  playCount: 0,
  lastPlayedAt: 0,
  savedPlay: null,
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},

      recordVisit: (storyId, nodeId) => {
        set((state) => {
          const current = state.progress[storyId] ?? emptyProgress
          if (current.visitedNodeIds.includes(nodeId)) return state
          return {
            progress: {
              ...state.progress,
              [storyId]: { ...current, visitedNodeIds: [...current.visitedNodeIds, nodeId] },
            },
          }
        })
      },

      recordEnding: (storyId, nodeId) => {
        set((state) => {
          const current = state.progress[storyId] ?? emptyProgress
          if (current.discoveredEndingIds.includes(nodeId)) return state
          return {
            progress: {
              ...state.progress,
              [storyId]: {
                ...current,
                discoveredEndingIds: [...current.discoveredEndingIds, nodeId],
              },
            },
          }
        })
      },

      recordPlayStart: (storyId) => {
        set((state) => {
          const current = state.progress[storyId] ?? emptyProgress
          return {
            progress: {
              ...state.progress,
              [storyId]: {
                ...current,
                playCount: current.playCount + 1,
                lastPlayedAt: Date.now(),
              },
            },
          }
        })
      },

      savePlayState: (storyId, playState) => {
        set((state) => {
          const current = state.progress[storyId] ?? emptyProgress
          return { progress: { ...state.progress, [storyId]: { ...current, savedPlay: playState } } }
        })
      },

      clearProgress: (storyId) => {
        set((state) => {
          const progress = { ...state.progress }
          delete progress[storyId]
          return { progress }
        })
      },

      getProgress: (storyId) => get().progress[storyId] ?? emptyProgress,
    }),
    { name: 'plotline-progress' },
  ),
)
