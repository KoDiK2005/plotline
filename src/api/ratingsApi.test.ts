import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBatchStats, getTopWriters, likeStory, recordView, unlikeStory } from './ratingsApi'

const meta = { title: 'My Story', authorName: 'Ada', writerId: 'writer_1' }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockJsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response
}

describe('recordView', () => {
  it('POSTs to the view endpoint and returns the parsed stats', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ likes: 0, views: 1, likedByMe: false }))
    const result = await recordView('story_1', meta)
    expect(result).toEqual({ likes: 0, views: 1, likedByMe: false })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('/api/stories/story_1/view')
    expect(init?.method).toBe('POST')
  })

  it('returns null instead of throwing when the network call fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    const result = await recordView('story_1', meta)
    expect(result).toBeNull()
  })

  it('returns null on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'bad' }, false))
    const result = await recordView('story_1', meta)
    expect(result).toBeNull()
  })
})

describe('likeStory / unlikeStory', () => {
  it('PUTs likerId alongside the story metadata', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ likes: 1, views: 0, likedByMe: true }))
    const result = await likeStory('story_1', meta, 'liker_a')
    expect(result).toEqual({ likes: 1, views: 0, likedByMe: true })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual({ ...meta, likerId: 'liker_a' })
  })

  it('DELETEs with the likerId', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ likes: 0, views: 0, likedByMe: false }))
    const result = await unlikeStory('story_1', 'liker_a')
    expect(result).toEqual({ likes: 0, views: 0, likedByMe: false })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('DELETE')
  })
})

describe('getBatchStats', () => {
  it('resolves to an empty object without a network call when given no ids', async () => {
    const result = await getBatchStats([])
    expect(result).toEqual({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('builds a comma-separated ids query', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ a: { likes: 0, views: 0, likedByMe: false } }))
    await getBatchStats(['a', 'b'], 'liker_a')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('ids=a%2Cb')
    expect(url).toContain('likerId=liker_a')
  })
})

describe('getTopWriters', () => {
  it('returns the parsed list', async () => {
    const writers = [
      { writerId: 'w1', authorName: 'Ada', storyCount: 1, totalLikes: 1, totalViews: 0, rating: 5 },
    ]
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(writers))
    const result = await getTopWriters(5)
    expect(result).toEqual(writers)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('limit=5')
  })
})
