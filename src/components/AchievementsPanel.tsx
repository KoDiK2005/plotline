import { useId } from 'react'
import type { AchievementStatus } from '../engine/achievements'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { Button } from './Button'

interface AchievementsPanelProps {
  achievements: AchievementStatus[]
  onClose: () => void
}

export function AchievementsPanel({ achievements, onClose }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const titleId = useId()
  const dialogRef = useDialogA11y(onClose)

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
            Достижения · {unlockedCount}/{achievements.length}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded-lg p-3 ${
                a.unlocked
                  ? 'bg-violet-500/10'
                  : 'bg-slate-100 dark:bg-slate-800/60'
              }`}
            >
              <span className="text-lg leading-none">{a.unlocked ? '🏆' : '🔒'}</span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    a.unlocked ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {a.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{a.description}</p>
                {!a.unlocked && a.progress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min(100, (a.progress.current / a.progress.target) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {a.progress.current}/{a.progress.target}
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}
