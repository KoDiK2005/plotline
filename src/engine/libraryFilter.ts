import type { Story } from '../types/story'
import type { ProgressSnapshot } from './achievements'
import { getStoryStats } from './traverse'

export type FilterOption = 'all' | 'unstarted' | 'in-progress' | 'completed'

export const FILTER_LABELS: Record<FilterOption, string> = {
  all: 'Все истории',
  unstarted: 'Не начатые',
  'in-progress': 'В процессе',
  completed: 'Все концовки найдены',
}

export function filterStories(
  stories: Story[],
  progress: Record<string, ProgressSnapshot>,
  filter: FilterOption,
): Story[] {
  if (filter === 'all') return stories
  return stories.filter((story) => {
    const p = progress[story.id]
    const playCount = p?.playCount ?? 0
    if (filter === 'unstarted') return playCount === 0

    const endingCount = getStoryStats(story).endingCount
    const discovered = p?.discoveredEndingIds.length ?? 0
    const completed = endingCount > 0 && discovered >= endingCount
    if (filter === 'completed') return completed
    return playCount > 0 && !completed
  })
}
