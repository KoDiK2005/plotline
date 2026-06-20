import type { Story } from '../../types/story'
import type { ValidationIssue } from '../../engine/validate'
import { deleteDanglingChoices } from '../../engine/storyOps'

interface IssuesPanelProps {
  issues: ValidationIssue[]
  onUpdate: (updater: (story: Story) => Story) => void
  onJumpToNode: (nodeId: string) => void
}

export function IssuesPanel({ issues, onUpdate, onJumpToNode }: IssuesPanelProps) {
  if (issues.length === 0) {
    return (
      <div className="border-b border-slate-200 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
        Всё в порядке: история готова к игре.
      </div>
    )
  }

  const danglingCount = issues.filter((issue) => issue.id.startsWith('dangling-')).length

  return (
    <div className="max-h-48 overflow-y-auto border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      {danglingCount > 0 && (
        <button
          onClick={() => onUpdate((s) => deleteDanglingChoices(s))}
          className="mb-2 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
        >
          Удалить все варианты без цели ({danglingCount})
        </button>
      )}
      <ul className="flex flex-col gap-1.5">
        {issues.map((issue) => (
          <li key={issue.id} className="flex items-center justify-between gap-3 text-sm">
            <span className={issue.severity === 'error' ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}>
              {issue.severity === 'error' ? '⛔' : '⚠'} {issue.message}
            </span>
            {issue.nodeId && (
              <button
                onClick={() => onJumpToNode(issue.nodeId!)}
                className="shrink-0 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                Перейти
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
