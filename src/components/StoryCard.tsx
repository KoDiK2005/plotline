import type { Story } from '../types/story'
import { getStoryStats } from '../engine/traverse'
import { useProgressStore } from '../store/useProgressStore'
import { Button } from './Button'
import { StatPill } from './StatPill'

interface StoryCardProps {
  story: Story
  onPlay: () => void
  onEdit: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
}

export function StoryCard({ story, onPlay, onEdit, onDuplicate, onExport, onDelete }: StoryCardProps) {
  const stats = getStoryStats(story)
  const progress = useProgressStore((s) => s.getProgress(story.id))

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{story.title}</h3>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-400">
        {story.description || 'Без описания.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatPill label="сцен" value={stats.nodeCount} />
        <StatPill label="концовок" value={stats.endingCount} />
        {stats.unreachableCount > 0 && (
          <StatPill label="недостижимых" value={stats.unreachableCount} tone="warning" />
        )}
        {progress.discoveredEndingIds.length > 0 && (
          <StatPill label={`из ${stats.endingCount} найдено`} value={progress.discoveredEndingIds.length} />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onPlay}>
          Играть
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onEdit}>
          Редактировать
        </Button>
      </div>
      <div className="mt-2 flex gap-1 text-xs">
        <Button variant="ghost" className="flex-1 px-2 py-1 text-xs" onClick={onDuplicate}>
          Дублировать
        </Button>
        <Button variant="ghost" className="flex-1 px-2 py-1 text-xs" onClick={onExport}>
          Экспорт
        </Button>
        <Button variant="ghost" className="flex-1 px-2 py-1 text-xs text-red-500" onClick={onDelete}>
          Удалить
        </Button>
      </div>
    </div>
  )
}
