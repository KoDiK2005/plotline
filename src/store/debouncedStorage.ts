import type { PersistStorage, StorageValue } from 'zustand/middleware'

const DEFAULT_DELAY_MS = 500

const flushers = new Set<() => void>()

/**
 * A persist storage that defers both JSON.stringify and the localStorage write
 * until `delayMs` of inactivity. Without this, every single store update (e.g.
 * each keystroke while editing a story) would synchronously serialize and
 * write the whole persisted slice, which gets slower as stories/libraries grow.
 * Flushes immediately on tab hide/close so no edit is lost.
 */
export function createDebouncedStorage<S>(delayMs = DEFAULT_DELAY_MS): PersistStorage<S> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const pendingValues = new Map<string, StorageValue<S>>()

  function flush(name: string): void {
    const timer = timers.get(name)
    if (timer) clearTimeout(timer)
    timers.delete(name)
    const value = pendingValues.get(name)
    if (value !== undefined) {
      localStorage.setItem(name, JSON.stringify(value))
      pendingValues.delete(name)
    }
  }

  function flushAll(): void {
    for (const name of [...pendingValues.keys()]) flush(name)
  }
  flushers.add(flushAll)

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushAll)
    window.addEventListener('beforeunload', flushAll)
  }

  return {
    getItem: (name) => {
      const raw = localStorage.getItem(name)
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null
    },
    setItem: (name, value) => {
      pendingValues.set(name, value)
      const existing = timers.get(name)
      if (existing) clearTimeout(existing)
      timers.set(name, setTimeout(() => flush(name), delayMs))
    },
    removeItem: (name) => {
      const timer = timers.get(name)
      if (timer) clearTimeout(timer)
      timers.delete(name)
      pendingValues.delete(name)
      localStorage.removeItem(name)
    },
  }
}

/** Forces every debounced storage instance to write out immediately. Used between tests so pending timers don't leak across test files. */
export function flushAllPendingStorageWrites(): void {
  for (const flush of flushers) flush()
}
