import type { Story } from '../types/story'
import { getStoryStats } from './traverse'

export type SortOption = 'updated' | 'title' | 'created-desc' | 'created-asc' | 'rating' | 'most-played' | 'size-desc' | 'size-asc'

export const SORT_LABELS: Record<SortOption, string> = {
  updated: 'Недавно изменённые',
  title: 'По названию',
  'created-desc': 'Сначала новые',
  'created-asc': 'Сначала старые',
  rating: 'По рейтингу',
  'most-played': 'Чаще всего запускали',
  'size-desc': 'Сначала длинные',
  'size-asc': 'Сначала короткие',
}

export function sortStories(
  stories: Story[],
  sort: SortOption,
  ratingByStoryId: Record<string, number> = {},
  playCountByStoryId: Record<string, number> = {},
): Story[] {
  const sorted = [...stories]
  switch (sort) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    case 'created-desc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'created-asc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'rating':
      return sorted.sort((a, b) => (ratingByStoryId[b.id] ?? 0) - (ratingByStoryId[a.id] ?? 0))
    case 'most-played':
      return sorted.sort((a, b) => (playCountByStoryId[b.id] ?? 0) - (playCountByStoryId[a.id] ?? 0))
    case 'size-desc':
      return sorted.sort((a, b) => getStoryStats(b).nodeCount - getStoryStats(a).nodeCount)
    case 'size-asc':
      return sorted.sort((a, b) => getStoryStats(a).nodeCount - getStoryStats(b).nodeCount)
    case 'updated':
    default:
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
