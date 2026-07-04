import { create } from 'zustand'
import * as ratingsApi from '../api/ratingsApi'
import type { StoryMeta, StoryStats, TopWriter } from '../api/ratingsApi'
import { useWriterStore } from './useWriterStore'

const ZERO_STATS: StoryStats = { likes: 0, views: 0, likedByMe: false }

interface RatingState {
  stats: Record<string, StoryStats>
  topWriters: TopWriter[]
  getStats: (storyId: string) => StoryStats
  loadStats: (storyIds: string[]) => Promise<void>
  recordView: (storyId: string, meta: StoryMeta) => Promise<void>
  toggleLike: (storyId: string, meta: StoryMeta) => Promise<void>
  loadTopWriters: (limit?: number) => Promise<void>
}

export const useRatingStore = create<RatingState>()((set, get) => ({
  stats: {},
  topWriters: [],

  getStats: (storyId) => get().stats[storyId] ?? ZERO_STATS,

  loadStats: async (storyIds) => {
    const likerId = useWriterStore.getState().writerId
    const result = await ratingsApi.getBatchStats(storyIds, likerId)
    if (!result) return
    set((state) => ({ stats: { ...state.stats, ...result } }))
  },

  recordView: async (storyId, meta) => {
    const result = await ratingsApi.recordView(storyId, meta)
    if (!result) return
    set((state) => ({ stats: { ...state.stats, [storyId]: result } }))
  },

  toggleLike: async (storyId, meta) => {
    const likerId = useWriterStore.getState().writerId
    const current = get().stats[storyId] ?? ZERO_STATS
    const result = current.likedByMe
      ? await ratingsApi.unlikeStory(storyId, likerId)
      : await ratingsApi.likeStory(storyId, meta, likerId)
    if (!result) return
    set((state) => ({ stats: { ...state.stats, [storyId]: result } }))
  },

  loadTopWriters: async (limit) => {
    const result = await ratingsApi.getTopWriters(limit)
    if (!result) return
    set({ topWriters: result })
  },
}))
