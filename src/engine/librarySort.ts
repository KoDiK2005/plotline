import type { Story } from '../types/story'

export type SortOption = 'updated' | 'title' | 'created-desc' | 'created-asc' | 'rating'

export const SORT_LABELS: Record<SortOption, string> = {
  updated: 'Недавно изменённые',
  title: 'По названию',
  'created-desc': 'Сначала новые',
  'created-asc': 'Сначала старые',
  rating: 'По рейтингу',
}

export function sortStories(
  stories: Story[],
  sort: SortOption,
  ratingByStoryId: Record<string, number> = {},
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
    case 'updated':
    default:
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
