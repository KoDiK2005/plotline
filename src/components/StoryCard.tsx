import { memo, useMemo } from 'react'
import type { Story } from '../types/story'
import { buildStandaloneHtml } from '../engine/exportHtml'
import { buildPlainTextScript } from '../engine/exportText'
import { buildTweeScript } from '../engine/exportTwee'
import { estimateReadingMinutes } from '../engine/readingTime'
import { getStoryStats } from '../engine/traverse'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useProgressStore } from '../store/useProgressStore'
import { useRatingStore } from '../store/useRatingStore'
import { downloadJson, downloadText, slugifyFilename } from '../utils/file'
import { Button } from './Button'
import { StatPill } from './StatPill'

interface StoryCardProps {
  story: Story
  onPlay: (storyId: string) => void
  onEdit: (storyId: string) => void
  onDuplicate: (storyId: string) => void
  onDelete: (storyId: string) => void
  onResetProgress: (storyId: string) => void
}

// Memoized because the library can hold many cards: without this, every
// keystroke in the search box or any unrelated store update would re-render
// every card, not just the ones whose underlying story actually changed.
// This only pays off because the callback props above are stable references
// (Zustand actions / useState setters) rather than per-card closures — see
// LibraryScreen, which passes them through unwrapped.
export const StoryCard = memo(function StoryCard({
  story,
  onPlay,
  onEdit,
  onDuplicate,
  onDelete,
  onResetProgress,
}: StoryCardProps) {
  const stats = useMemo(() => getStoryStats(story), [story])
  const readingMinutes = useMemo(() => estimateReadingMinutes(story), [story])
  const progress = useProgressStore((s) => s.getProgress(story.id))
  const isFavorite = useFavoriteStore((s) => s.isFavorite(story.id))
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite)
  const ratingStats = useRatingStore((s) => s.getStats(story.id))
  const toggleLike = useRatingStore((s) => s.toggleLike)

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{story.title}</h3>
        <button
          onClick={() => toggleFavorite(story.id)}
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          className={
            isFavorite
              ? 'shrink-0 text-amber-400'
              : 'shrink-0 text-slate-300 hover:text-amber-400 dark:text-slate-600'
          }
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </header>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-400">
        {story.description || 'Без описания.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatPill label="сцен" value={stats.nodeCount} />
        <StatPill label="концовок" value={stats.endingCount} />
        <StatPill label="мин чтения" value={`~${readingMinutes}`} />
        {stats.unreachableCount > 0 && (
          <StatPill label="недостижимых" value={stats.unreachableCount} tone="warning" />
        )}
        {progress.discoveredEndingIds.length > 0 && (
          <StatPill label={`из ${stats.endingCount} найдено`} value={progress.discoveredEndingIds.length} />
        )}
        <StatPill label="просмотров" value={ratingStats.views} />
        <button
          onClick={() =>
            toggleLike(story.id, { title: story.title, authorName: story.author, writerId: story.writerId })
          }
          aria-pressed={ratingStats.likedByMe}
          aria-label={ratingStats.likedByMe ? 'Убрать лайк' : 'Поставить лайк'}
          title={ratingStats.likedByMe ? 'Убрать лайк' : 'Поставить лайк'}
          className={
            ratingStats.likedByMe
              ? 'inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500'
              : 'inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700 hover:text-rose-500 dark:bg-slate-800 dark:text-slate-300'
          }
        >
          {ratingStats.likedByMe ? '♥' : '♡'} {ratingStats.likes}
        </button>
      </div>

      {stats.endingCount > 0 && progress.discoveredEndingIds.length > 0 && (
        <div
          className="mt-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          style={{ height: 4 }}
          title={`Концовок найдено: ${progress.discoveredEndingIds.length} из ${stats.endingCount}`}
          role="progressbar"
          aria-valuenow={progress.discoveredEndingIds.length}
          aria-valuemin={0}
          aria-valuemax={stats.endingCount}
          aria-label={`Концовок найдено: ${progress.discoveredEndingIds.length} из ${stats.endingCount}`}
        >
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.min(100, (progress.discoveredEndingIds.length / stats.endingCount) * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={() => onPlay(story.id)}>
          Играть
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => onEdit(story.id)}>
          Редактировать
        </Button>
      </div>
      <div className="mt-2 flex gap-1 text-xs">
        <Button variant="ghost" className="flex-1 px-2 py-1 text-xs" onClick={() => onDuplicate(story.id)}>
          Дублировать
        </Button>
        <Button
          variant="ghost"
          className="flex-1 px-2 py-1 text-xs"
          onClick={() => downloadJson(`${slugifyFilename(story.title)}.json`, story)}
        >
          JSON
        </Button>
        <Button
          variant="ghost"
          className="flex-1 px-2 py-1 text-xs"
          onClick={() => downloadText(`${slugifyFilename(story.title)}.html`, buildStandaloneHtml(story), 'text/html')}
          title="Скачать как самостоятельную HTML-страницу"
        >
          HTML
        </Button>
        <Button
          variant="ghost"
          className="flex-1 px-2 py-1 text-xs"
          onClick={() => downloadText(`${slugifyFilename(story.title)}.txt`, buildPlainTextScript(story), 'text/plain')}
          title="Скачать как текстовый сценарий"
        >
          TXT
        </Button>
        <Button
          variant="ghost"
          className="flex-1 px-2 py-1 text-xs"
          onClick={() => downloadText(`${slugifyFilename(story.title)}.twee`, buildTweeScript(story), 'text/plain')}
          title="Скачать как Twee 3 / SugarCube для Twine 2"
        >
          Twee
        </Button>
        <Button variant="ghost" className="flex-1 px-2 py-1 text-xs text-red-500" onClick={() => onDelete(story.id)}>
          Удалить
        </Button>
      </div>
      {progress.playCount > 0 && (
        <Button
          variant="ghost"
          className="mt-1 px-2 py-1 text-xs text-slate-500 dark:text-slate-500"
          onClick={() => onResetProgress(story.id)}
        >
          Сбросить прогресс
        </Button>
      )}
    </div>
  )
})
