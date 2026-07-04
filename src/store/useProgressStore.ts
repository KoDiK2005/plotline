import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlayState } from '../engine/play'
import { createDebouncedStorage } from './debouncedStorage'

export interface StoryProgress {
  visitedNodeIds: string[]
  visitedChoiceIds: string[]
  discoveredEndingIds: string[]
  playCount: number
  lastPlayedAt: number
  savedPlay: PlayState | null
}

interface ProgressState {
  progress: Record<string, StoryProgress>
  recordVisit: (storyId: string, nodeId: string) => void
  recordChoice: (storyId: string, choiceId: string) => void
  recordEnding: (storyId: string, nodeId: string) => void
  recordPlayStart: (storyId: string) => void
  savePlayState: (storyId: string, playState: PlayState | null) => void
  clearProgress: (storyId: string) => void
  getProgress: (storyId: string) => StoryProgress
}

const emptyProgress: StoryProgress = {
  visitedNodeIds: [],
  visitedChoiceIds: [],
  discoveredEndingIds: [],
  playCount: 0,
  lastPlayedAt: 0,
  savedPlay: null,
}

// Persisted data may predate newer StoryProgress fields (e.g. visitedChoiceIds),
// so backfill defaults for those. Returns the same reference when nothing is
// missing, so callers selecting this from the store don't get a new object
// (and an infinite re-render loop) on every read.
const mergedCache = new WeakMap<StoryProgress, StoryProgress>()

function withDefaults(stored: StoryProgress | undefined): StoryProgress {
  if (!stored) return emptyProgress
  const isComplete = Object.keys(emptyProgress).every((key) => key in stored)
  if (isComplete) return stored
  if (mergedCache.has(stored)) return mergedCache.get(stored)!
  const merged = { ...emptyProgress, ...stored }
  mergedCache.set(stored, merged)
  return merged
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},

      recordVisit: (storyId, nodeId) => {
        set((state) => {
          const current = withDefaults(state.progress[storyId])
          if (current.visitedNodeIds.includes(nodeId)) return state
          return {
            progress: {
              ...state.progress,
              [storyId]: { ...current, visitedNodeIds: [...current.visitedNodeIds, nodeId] },
            },
          }
        })
      },

      recordChoice: (storyId, choiceId) => {
        set((state) => {
          const current = withDefaults(state.progress[storyId])
          if (current.visitedChoiceIds.includes(choiceId)) return state
          return {
            progress: {
              ...state.progress,
              [storyId]: { ...current, visitedChoiceIds: [...current.visitedChoiceIds, choiceId] },
            },
          }
        })
      },

      recordEnding: (storyId, nodeId) => {
        set((state) => {
          const current = withDefaults(state.progress[storyId])
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
          const current = withDefaults(state.progress[storyId])
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
          const current = withDefaults(state.progress[storyId])
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

      getProgress: (storyId) => withDefaults(get().progress[storyId]),
    }),
    { name: 'plotline-progress', storage: createDebouncedStorage() },
  ),
)
