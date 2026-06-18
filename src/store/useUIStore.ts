import { create } from 'zustand'

export type View = 'library' | 'editor' | 'player'

interface UIState {
  view: View
  currentStoryId: string | null
  selectedNodeId: string | null
  openEditor: (storyId: string) => void
  openPlayer: (storyId: string) => void
  backToLibrary: () => void
  selectNode: (nodeId: string | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  view: 'library',
  currentStoryId: null,
  selectedNodeId: null,

  openEditor: (storyId) => set({ view: 'editor', currentStoryId: storyId, selectedNodeId: null }),
  openPlayer: (storyId) => set({ view: 'player', currentStoryId: storyId, selectedNodeId: null }),
  backToLibrary: () => set({ view: 'library', currentStoryId: null, selectedNodeId: null }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
}))
