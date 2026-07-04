import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterOption } from '../engine/libraryFilter'
import type { SortOption } from '../engine/librarySort'

export type Theme = 'dark' | 'light'

interface SettingsState {
  theme: Theme
  toggleTheme: () => void
  librarySort: SortOption
  libraryFilter: FilterOption
  libraryFavoritesOnly: boolean
  setLibrarySort: (sort: SortOption) => void
  setLibraryFilter: (filter: FilterOption) => void
  setLibraryFavoritesOnly: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      librarySort: 'updated',
      libraryFilter: 'all',
      libraryFavoritesOnly: false,
      setLibrarySort: (librarySort) => set({ librarySort }),
      setLibraryFilter: (libraryFilter) => set({ libraryFilter }),
      setLibraryFavoritesOnly: (libraryFavoritesOnly) => set({ libraryFavoritesOnly }),
    }),
    { name: 'plotline-settings' },
  ),
)
