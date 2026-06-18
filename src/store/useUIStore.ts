import { create } from 'zustand'

export type View = 'library' | 'editor' | 'player'

interface UIState {
  view: View
  currentStoryId: string | null
  selectedNodeId: string | null
  showShortcuts: boolean
  openEditor: (storyId: string) => void
  openPlayer: (storyId: string) => void
  backToLibrary: () => void
  selectNode: (nodeId: string | null) => void
  openShortcuts: () => void
  closeShortcuts: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  view: 'library',
  currentStoryId: null,
  selectedNodeId: null,
  showShortcuts: false,

  openEditor: (storyId) => set({ view: 'editor', currentStoryId: storyId, selectedNodeId: null }),
  openPlayer: (storyId) => set({ view: 'player', currentStoryId: storyId, selectedNodeId: null }),
  backToLibrary: () => set({ view: 'library', currentStoryId: null, selectedNodeId: null }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  openShortcuts: () => set({ showShortcuts: true }),
  closeShortcuts: () => set({ showShortcuts: false }),
}))
