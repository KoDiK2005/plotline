import { beforeEach, describe, expect, it } from 'vitest'
import { useWriterStore } from './useWriterStore'

describe('useWriterStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useWriterStore.persist.clearStorage()
  })

  it('has a non-empty writerId and a default display name', () => {
    const { writerId, displayName } = useWriterStore.getState()
    expect(writerId.length).toBeGreaterThan(0)
    expect(displayName).toBe('Аноним')
  })

  it('keeps the same writerId across calls', () => {
    const first = useWriterStore.getState().writerId
    const second = useWriterStore.getState().writerId
    expect(first).toBe(second)
  })

  it('updates the display name', () => {
    useWriterStore.getState().setDisplayName('Ada')
    expect(useWriterStore.getState().displayName).toBe('Ada')
  })
})
