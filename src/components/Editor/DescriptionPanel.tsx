import type { Story } from '../../types/story'
import { updateMeta } from '../../engine/storyOps'

interface DescriptionPanelProps {
  story: Story
  onUpdate: (updater: (story: Story) => Story) => void
}

export function DescriptionPanel({ story, onUpdate }: DescriptionPanelProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Автор
        <input
          type="text"
          value={story.author}
          onChange={(e) => onUpdate((s) => updateMeta(s, { author: e.target.value }))}
          placeholder="Имя, под которым история будет видна в общем рейтинге."
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Описание истории
        <textarea
          value={story.description}
          onChange={(e) => onUpdate((s) => updateMeta(s, { description: e.target.value }))}
          placeholder="Короткое описание — оно показывается на карточке истории в библиотеке."
          rows={2}
          className="resize-none rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
    </div>
  )
}
