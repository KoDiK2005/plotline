import type { Story } from '../../types/story'
import { addVariable, deleteVariable, updateVariable } from '../../engine/storyOps'
import { Button } from '../Button'

interface VariablesPanelProps {
  story: Story
  onUpdate: (updater: (story: Story) => Story) => void
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export function VariablesPanel({ story, onUpdate }: VariablesPanelProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          Переменные истории
        </h3>
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          onClick={() => onUpdate((s) => addVariable(s, 'Переменная', 0).story)}
        >
          + Добавить
        </Button>
      </div>

      {story.variables.length === 0 ? (
        <p className="text-xs italic text-slate-400">
          Переменных нет. Они нужны, чтобы варианты выбора зависели от прошлых решений игрока (предметы,
          доверие, очки и т.п.) — добавьте переменную и используйте её в условиях и эффектах вариантов.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {story.variables.map((variable) => (
            <div
              key={variable.id}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900"
            >
              <input
                value={variable.name}
                onChange={(e) => onUpdate((s) => updateVariable(s, variable.id, { name: e.target.value }))}
                className={`${fieldClass} w-28`}
              />
              <span className="text-xs text-slate-400">=</span>
              <input
                type="number"
                value={variable.initialValue}
                onChange={(e) =>
                  onUpdate((s) => updateVariable(s, variable.id, { initialValue: Number(e.target.value) || 0 }))
                }
                className={`${fieldClass} w-16`}
              />
              <button
                onClick={() => onUpdate((s) => deleteVariable(s, variable.id))}
                className="px-1 text-xs text-red-500 hover:text-red-600"
                title="Удалить переменную"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
