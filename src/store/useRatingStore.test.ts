import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ratingsApi from '../api/ratingsApi'
import { useRatingStore } from './useRatingStore'
import { useWriterStore } from './useWriterStore'

const meta = { title: 'My Story', authorName: 'Ada', writerId: 'writer_1' }

beforeEach(() => {
  useRatingStore.setState({ stats: {}, topWriters: [] })
  localStorage.clear()
  useWriterStore.persist.clearStorage()
})

describe('getStats', () => {
  it('defaults to zero stats for a story with nothing cached', () => {
    expect(useRatingStore.getState().getStats('unknown')).toEqual({ likes: 0, views: 0, likedByMe: false })
  })
})

describe('loadStats', () => {
  it('merges fetched stats into the cache', async () => {
    vi.spyOn(ratingsApi, 'getBatchStats').mockResolvedValue({
      a: { likes: 2, views: 5, likedByMe: true },
    })
    await useRatingStore.getState().loadStats(['a'])
    expect(useRatingStore.getState().getStats('a')).toEqual({ likes: 2, views: 5, likedByMe: true })
  })

  it('leaves the cache untouched when the request fails', async () => {
    vi.spyOn(ratingsApi, 'getBatchStats').mockResolvedValue(null)
    await useRatingStore.getState().loadStats(['a'])
    expect(useRatingStore.getState().getStats('a')).toEqual({ likes: 0, views: 0, likedByMe: false })
  })
})

describe('recordView', () => {
  it('stores the returned stats for that story', async () => {
    vi.spyOn(ratingsApi, 'recordView').mockResolvedValue({ likes: 0, views: 1, likedByMe: false })
    await useRatingStore.getState().recordView('story_1', meta)
    expect(useRatingStore.getState().getStats('story_1')).toEqual({ likes: 0, views: 1, likedByMe: false })
  })
})

describe('toggleLike', () => {
  it('likes when not currently liked', async () => {
    const likeSpy = vi.spyOn(ratingsApi, 'likeStory').mockResolvedValue({ likes: 1, views: 0, likedByMe: true })
    await useRatingStore.getState().toggleLike('story_1', meta)
    expect(likeSpy).toHaveBeenCalledWith('story_1', meta, useWriterStore.getState().writerId)
    expect(useRatingStore.getState().getStats('story_1')).toEqual({ likes: 1, views: 0, likedByMe: true })
  })

  it('unlikes when already liked', async () => {
    useRatingStore.setState({ stats: { story_1: { likes: 1, views: 0, likedByMe: true } }, topWriters: [] })
    const unlikeSpy = vi
      .spyOn(ratingsApi, 'unlikeStory')
      .mockResolvedValue({ likes: 0, views: 0, likedByMe: false })
    await useRatingStore.getState().toggleLike('story_1', meta)
    expect(unlikeSpy).toHaveBeenCalledWith('story_1', useWriterStore.getState().writerId)
    expect(useRatingStore.getState().getStats('story_1')).toEqual({ likes: 0, views: 0, likedByMe: false })
  })
})

describe('loadTopWriters', () => {
  it('stores the fetched list', async () => {
    const writers = [
      { writerId: 'w1', authorName: 'Ada', storyCount: 1, totalLikes: 1, totalViews: 0, rating: 5 },
    ]
    vi.spyOn(ratingsApi, 'getTopWriters').mockResolvedValue(writers)
    await useRatingStore.getState().loadTopWriters()
    expect(useRatingStore.getState().topWriters).toEqual(writers)
  })
})
