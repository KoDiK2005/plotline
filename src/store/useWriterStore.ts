import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '../engine/id'
import { createDebouncedStorage } from './debouncedStorage'

interface WriterState {
  writerId: string
  displayName: string
  setDisplayName: (name: string) => void
}

export const useWriterStore = create<WriterState>()(
  persist(
    (set) => ({
      writerId: generateId('writer'),
      displayName: 'Аноним',
      setDisplayName: (name) => set({ displayName: name }),
    }),
    { name: 'plotline-writer', storage: createDebouncedStorage() },
  ),
)
