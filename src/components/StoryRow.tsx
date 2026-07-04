import { memo, useMemo } from 'react'
import type { Story } from '../types/story'
import { getStoryStats } from '../engine/traverse'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useProgressStore } from '../store/useProgressStore'
import { useRatingStore } from '../store/useRatingStore'
import { relativeTime } from '../utils/relativeTime'
import { Button } from './Button'

interface StoryRowProps {
  story: Story
  onPlay: (storyId: string) => void
  onEdit: (storyId: string) => void
  onDelete: (storyId: string) => void
}

export const StoryRow = memo(function StoryRow({ story, onPlay, onEdit, onDelete }: StoryRowProps) {
  const stats = useMemo(() => getStoryStats(story), [story])
  const progress = useProgressStore((s) => s.getProgress(story.id))
  const allEndingsFound = stats.endingCount > 0 && progress.discoveredEndingIds.length >= stats.endingCount
  const isFavorite = useFavoriteStore((s) => s.isFavorite(story.id))
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite)
  const ratingStats = useRatingStore((s) => s.getStats(story.id))

  const lastPlayed = progress.lastPlayedAt ? relativeTime(progress.lastPlayedAt) : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => toggleFavorite(story.id)}
        aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        aria-pressed={isFavorite}
        className={isFavorite ? 'shrink-0 text-amber-400' : 'shrink-0 text-slate-300 hover:text-amber-400 dark:text-slate-600'}
      >
        {isFavorite ? '★' : '☆'}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{story.title}</span>
          {allEndingsFound && (
            <span title="Все концовки найдены!" aria-label="Все концовки найдены" className="shrink-0 text-amber-400 text-xs">✦</span>
          )}
        </div>
        {story.author && story.author !== 'Аноним' && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{story.author}</span>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-3 text-xs text-slate-500 sm:flex">
        <span title="Сцен">{stats.nodeCount} сц.</span>
        <span title="Концовок">{stats.endingCount} конц.</span>
        {ratingStats.views > 0 && <span title="Просмотров">👁 {ratingStats.views}</span>}
        {lastPlayed && <span title="Последнее прохождение">{lastPlayed}</span>}
      </div>

      {stats.endingCount > 0 && progress.discoveredEndingIds.length > 0 && (
        <div
          className="hidden w-16 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-slate-800"
          style={{ height: 4 }}
          title={`Концовок: ${progress.discoveredEndingIds.length}/${stats.endingCount}`}
          role="progressbar"
          aria-valuenow={progress.discoveredEndingIds.length}
          aria-valuemin={0}
          aria-valuemax={stats.endingCount}
        >
          <div
            className={`h-full rounded-full ${allEndingsFound ? 'bg-amber-400' : 'bg-violet-500'}`}
            style={{ width: `${Math.min(100, (progress.discoveredEndingIds.length / stats.endingCount) * 100)}%` }}
          />
        </div>
      )}

      <div className="flex shrink-0 gap-1.5">
        <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={() => onPlay(story.id)}>
          Играть
        </Button>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onEdit(story.id)}>
          Ред.
        </Button>
        <Button variant="ghost" className="px-3 py-1.5 text-xs text-red-500" onClick={() => onDelete(story.id)}>
          Удалить
        </Button>
      </div>
    </div>
  )
})
