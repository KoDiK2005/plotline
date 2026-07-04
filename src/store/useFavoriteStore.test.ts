import { beforeEach, describe, expect, it } from 'vitest'
import { useFavoriteStore } from './useFavoriteStore'

describe('useFavoriteStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useFavoriteStore.persist.clearStorage()
    useFavoriteStore.setState({ favorites: {} })
  })

  it('is not a favorite by default', () => {
    expect(useFavoriteStore.getState().isFavorite('story-1')).toBe(false)
  })

  it('toggles a story into and out of favorites', () => {
    const { toggleFavorite, isFavorite } = useFavoriteStore.getState()
    toggleFavorite('story-1')
    expect(isFavorite('story-1')).toBe(true)

    toggleFavorite('story-1')
    expect(isFavorite('story-1')).toBe(false)
  })

  it('keeps favorites independent across stories', () => {
    const { toggleFavorite, isFavorite } = useFavoriteStore.getState()
    toggleFavorite('story-1')

    expect(isFavorite('story-1')).toBe(true)
    expect(isFavorite('story-2')).toBe(false)
  })
})
