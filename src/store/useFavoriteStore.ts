import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createDebouncedStorage } from './debouncedStorage'

interface FavoriteState {
  favorites: Record<string, boolean>
  toggleFavorite: (storyId: string) => void
  isFavorite: (storyId: string) => boolean
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: {},

      toggleFavorite: (storyId) => {
        set((state) => {
          const favorites = { ...state.favorites }
          if (favorites[storyId]) {
            delete favorites[storyId]
          } else {
            favorites[storyId] = true
          }
          return { favorites }
        })
      },

      isFavorite: (storyId) => Boolean(get().favorites[storyId]),
    }),
    { name: 'plotline-favorites', storage: createDebouncedStorage() },
  ),
)
