import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Story } from '../types/story'
import { sampleStories } from '../data/sampleStories'
import * as ops from '../engine/storyOps'
import { buildFromTemplate, type TemplateId } from '../engine/templates'
import { createDebouncedStorage } from './debouncedStorage'

interface LibraryState {
  stories: Record<string, Story>
  createStory: (title?: string, templateId?: TemplateId) => string
  deleteStory: (id: string) => void
  duplicateStory: (id: string) => string | null
  importStory: (story: Story) => string
  updateStory: (id: string, updater: (story: Story) => Story) => void
  resetToSamples: () => void
}

function sampleStoriesRecord(): Record<string, Story> {
  return Object.fromEntries(sampleStories.map((story) => [story.id, story]))
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      stories: sampleStoriesRecord(),

      createStory: (title, templateId) => {
        const story = templateId
          ? buildFromTemplate(templateId, title ?? 'Новая история')
          : ops.createStory(title)
        set((state) => ({ stories: { ...state.stories, [story.id]: story } }))
        return story.id
      },

      deleteStory: (id) => {
        set((state) => {
          const stories = { ...state.stories }
          delete stories[id]
          return { stories }
        })
      },

      duplicateStory: (id) => {
        const original = get().stories[id]
        if (!original) return null
        const copy = ops.duplicateStory(original)
        set((state) => ({ stories: { ...state.stories, [copy.id]: copy } }))
        return copy.id
      },

      importStory: (story) => {
        const imported = ops.duplicateStory(story, story.title)
        set((state) => ({ stories: { ...state.stories, [imported.id]: imported } }))
        return imported.id
      },

      updateStory: (id, updater) => {
        set((state) => {
          const current = state.stories[id]
          if (!current) return state
          return { stories: { ...state.stories, [id]: updater(current) } }
        })
      },

      resetToSamples: () => set({ stories: sampleStoriesRecord() }),
    }),
    { name: 'plotline-library', storage: createDebouncedStorage() },
  ),
)
