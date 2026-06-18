import type { Story } from '../types/story'

export type SortOption = 'updated' | 'title' | 'created-desc' | 'created-asc'

export const SORT_LABELS: Record<SortOption, string> = {
  updated: 'Недавно изменённые',
  title: 'По названию',
  'created-desc': 'Сначала новые',
  'created-asc': 'Сначала старые',
}

export function sortStories(stories: Story[], sort: SortOption): Story[] {
  const sorted = [...stories]
  switch (sort) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    case 'created-desc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'created-asc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'updated':
    default:
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
