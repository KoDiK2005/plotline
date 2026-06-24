export interface StoryStats {
  likes: number
  views: number
  likedByMe: boolean
}

export interface TopWriter {
  writerId: string
  authorName: string
  storyCount: number
  totalLikes: number
  totalViews: number
  rating: number
}

export interface StoryMeta {
  title: string
  authorName: string
  writerId: string
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

/** Shared-rating requests must never break the app: any network failure resolves to null. */
async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export function recordView(storyId: string, meta: StoryMeta): Promise<StoryStats | null> {
  return safeFetch<StoryStats>(`${BASE_URL}/api/stories/${encodeURIComponent(storyId)}/view`, jsonInit('POST', meta))
}

export function likeStory(storyId: string, meta: StoryMeta, likerId: string): Promise<StoryStats | null> {
  return safeFetch<StoryStats>(
    `${BASE_URL}/api/stories/${encodeURIComponent(storyId)}/like`,
    jsonInit('PUT', { ...meta, likerId }),
  )
}

export function unlikeStory(storyId: string, likerId: string): Promise<StoryStats | null> {
  return safeFetch<StoryStats>(
    `${BASE_URL}/api/stories/${encodeURIComponent(storyId)}/like`,
    jsonInit('DELETE', { likerId }),
  )
}

export function getBatchStats(storyIds: string[], likerId?: string): Promise<Record<string, StoryStats> | null> {
  if (storyIds.length === 0) return Promise.resolve({})
  const params = new URLSearchParams({ ids: storyIds.join(',') })
  if (likerId) params.set('likerId', likerId)
  return safeFetch<Record<string, StoryStats>>(`${BASE_URL}/api/stories/stats?${params.toString()}`)
}

export function getTopWriters(limit = 20): Promise<TopWriter[] | null> {
  return safeFetch<TopWriter[]>(`${BASE_URL}/api/writers/top?limit=${limit}`)
}
