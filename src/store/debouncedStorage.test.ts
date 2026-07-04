import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedStorage, flushAllPendingStorageWrites } from './debouncedStorage'

describe('createDebouncedStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    flushAllPendingStorageWrites()
    vi.useRealTimers()
  })

  it('does not write to localStorage immediately after setItem', () => {
    const storage = createDebouncedStorage<{ value: number }>()
    storage.setItem('plotline-test', { state: { value: 1 } })

    expect(localStorage.getItem('plotline-test')).toBeNull()
  })

  it('writes the latest value to localStorage once the delay elapses', () => {
    const storage = createDebouncedStorage<{ value: number }>(500)
    storage.setItem('plotline-test', { state: { value: 1 } })
    storage.setItem('plotline-test', { state: { value: 2 } })

    vi.advanceTimersByTime(500)

    expect(JSON.parse(localStorage.getItem('plotline-test')!)).toEqual({ state: { value: 2 } })
  })

  it('reads back a previously written value via getItem', () => {
    const storage = createDebouncedStorage<{ value: number }>(500)
    storage.setItem('plotline-test', { state: { value: 42 } })
    vi.advanceTimersByTime(500)

    expect(storage.getItem('plotline-test')).toEqual({ state: { value: 42 } })
  })

  it('removeItem clears a pending write instead of letting it land later', () => {
    const storage = createDebouncedStorage<{ value: number }>(500)
    storage.setItem('plotline-test', { state: { value: 1 } })
    storage.removeItem('plotline-test')

    vi.advanceTimersByTime(500)

    expect(localStorage.getItem('plotline-test')).toBeNull()
  })

  it('flushAllPendingStorageWrites forces every pending write out synchronously', () => {
    const storage = createDebouncedStorage<{ value: number }>(500)
    storage.setItem('plotline-test', { state: { value: 7 } })

    flushAllPendingStorageWrites()

    expect(JSON.parse(localStorage.getItem('plotline-test')!)).toEqual({ state: { value: 7 } })
  })
})
