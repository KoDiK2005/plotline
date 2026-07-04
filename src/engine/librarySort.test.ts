import { describe, expect, it } from 'vitest'
import type { Story } from '../types/story'
import { sortStories } from './librarySort'

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 'id',
    title: 'Untitled',
    description: '',
    author: '',
    writerId: '',
    startNodeId: null,
    nodes: {},
    variables: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('sortStories', () => {
  const stories: Story[] = [
    makeStory({ id: 'a', title: 'Вишня', createdAt: 100, updatedAt: 300 }),
    makeStory({ id: 'b', title: 'Абрикос', createdAt: 300, updatedAt: 100 }),
    makeStory({ id: 'c', title: 'Берёза', createdAt: 200, updatedAt: 200 }),
  ]

  it('sorts by title alphabetically (locale "ru") for "title"', () => {
    expect(sortStories(stories, 'title').map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts by updatedAt descending for "updated"', () => {
    expect(sortStories(stories, 'updated').map((s) => s.id)).toEqual(['a', 'c', 'b'])
  })

  it('sorts by createdAt descending for "created-desc"', () => {
    expect(sortStories(stories, 'created-desc').map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts by createdAt ascending for "created-asc"', () => {
    expect(sortStories(stories, 'created-asc').map((s) => s.id)).toEqual(['a', 'c', 'b'])
  })

  it('does not mutate the input array', () => {
    const copy = [...stories]
    sortStories(stories, 'title')
    expect(stories).toEqual(copy)
  })

  it('sorts by rating descending for "rating", treating missing entries as zero', () => {
    expect(sortStories(stories, 'rating', { a: 5, c: 10 }).map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('sorts by play count descending for "most-played", treating missing entries as zero', () => {
    expect(sortStories(stories, 'most-played', {}, { a: 3, b: 7 }).map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })
})
