import { useEffect, useId } from 'react'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { useRatingStore } from '../store/useRatingStore'
import { Button } from './Button'

interface TopWritersPanelProps {
  onClose: () => void
}

export function TopWritersPanel({ onClose }: TopWritersPanelProps) {
  const topWriters = useRatingStore((s) => s.topWriters)
  const loadTopWriters = useRatingStore((s) => s.loadTopWriters)
  const titleId = useId()
  const dialogRef = useDialogA11y(onClose)

  useEffect(() => {
    void loadTopWriters()
  }, [loadTopWriters])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl outline-none dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Топ авторов
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {topWriters.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">Пока нет авторов с оценёнными историями.</p>
        ) : (
          <ol className="mt-4 flex-1 space-y-2 overflow-y-auto">
            {topWriters.map((w, index) => (
              <li
                key={w.writerId}
                className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800/60"
              >
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{w.authorName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {w.storyCount} историй · ♥ {w.totalLikes} · {w.totalViews} просмотров
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400">
                  {w.rating}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}
