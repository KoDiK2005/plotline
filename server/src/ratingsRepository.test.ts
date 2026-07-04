import type Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from './db.js'
import {
  getBatchStats,
  getStats,
  getTopWriters,
  likeStory,
  recordView,
  unlikeStory,
  type StoryMeta,
} from './ratingsRepository.js'

let db: Database.Database

beforeEach(() => {
  db = openDatabase(':memory:')
})

function meta(overrides: Partial<StoryMeta> = {}): StoryMeta {
  return { storyId: 'story_1', title: 'My Story', authorName: 'Ada', writerId: 'writer_1', ...overrides }
}

describe('recordView', () => {
  it('creates the story on first view and increments views on each call', () => {
    expect(recordView(db, meta())).toEqual({ likes: 0, views: 1, likedByMe: false })
    expect(recordView(db, meta())).toEqual({ likes: 0, views: 2, likedByMe: false })
  })

  it('updates stale title/author metadata on a later view', () => {
    recordView(db, meta())
    recordView(db, meta({ title: 'Renamed', authorName: 'Ada Lovelace' }))
    const writers = getTopWriters(db, 10)
    expect(writers[0].authorName).toBe('Ada Lovelace')
  })
})

describe('likeStory / unlikeStory', () => {
  it('counts a like and reports likedByMe for that liker only', () => {
    const stats = likeStory(db, meta(), 'liker_a')
    expect(stats).toEqual({ likes: 1, views: 0, likedByMe: true })
    expect(getStats(db, 'story_1', 'liker_b').likedByMe).toBe(false)
  })

  it('is idempotent: liking twice with the same liker does not double-count', () => {
    likeStory(db, meta(), 'liker_a')
    const stats = likeStory(db, meta(), 'liker_a')
    expect(stats.likes).toBe(1)
  })

  it('counts likes from different likers separately', () => {
    likeStory(db, meta(), 'liker_a')
    const stats = likeStory(db, meta(), 'liker_b')
    expect(stats.likes).toBe(2)
  })

  it('unliking removes the like and is a no-op if not liked', () => {
    likeStory(db, meta(), 'liker_a')
    expect(unlikeStory(db, 'story_1', 'liker_a')).toEqual({ likes: 0, views: 0, likedByMe: false })
    expect(unlikeStory(db, 'story_1', 'liker_a')).toEqual({ likes: 0, views: 0, likedByMe: false })
  })
})

describe('getStats / getBatchStats', () => {
  it('defaults to zero stats for an unknown story', () => {
    expect(getStats(db, 'unknown')).toEqual({ likes: 0, views: 0, likedByMe: false })
  })

  it('returns stats for several stories in one call', () => {
    recordView(db, meta({ storyId: 'a' }))
    likeStory(db, meta({ storyId: 'b' }), 'liker_a')
    const result = getBatchStats(db, ['a', 'b', 'c'])
    expect(result).toEqual({
      a: { likes: 0, views: 1, likedByMe: false },
      b: { likes: 1, views: 0, likedByMe: false },
      c: { likes: 0, views: 0, likedByMe: false },
    })
  })

  it('reports likedByMe per story for the given liker in a batch call', () => {
    likeStory(db, meta({ storyId: 'a' }), 'liker_a')
    likeStory(db, meta({ storyId: 'b' }), 'liker_b')
    const result = getBatchStats(db, ['a', 'b'], 'liker_a')
    expect(result.a.likedByMe).toBe(true)
    expect(result.b.likedByMe).toBe(false)
  })
})

describe('getTopWriters', () => {
  it('aggregates likes and views across all of a writer\'s stories', () => {
    likeStory(db, meta({ storyId: 's1', writerId: 'w1' }), 'liker_a')
    likeStory(db, meta({ storyId: 's1', writerId: 'w1' }), 'liker_b')
    recordView(db, meta({ storyId: 's2', writerId: 'w1', title: 'Second' }))

    const [top] = getTopWriters(db, 10)
    expect(top.writerId).toBe('w1')
    expect(top.storyCount).toBe(2)
    expect(top.totalLikes).toBe(2)
    expect(top.totalViews).toBe(1)
    expect(top.rating).toBe(2 * 5 + 1)
  })

  it('orders writers by rating descending and respects the limit', () => {
    recordView(db, meta({ storyId: 's_low', writerId: 'w_low', authorName: 'Low' }))
    likeStory(db, meta({ storyId: 's_high', writerId: 'w_high', authorName: 'High' }), 'liker_a')

    const top = getTopWriters(db, 1)
    expect(top).toHaveLength(1)
    expect(top[0].writerId).toBe('w_high')
  })
})
