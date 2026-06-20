import { useState } from 'react'
import type { Story, VariableType } from '../../types/story'
import { addVariable, countVariableUsages, deleteVariable, updateVariable } from '../../engine/storyOps'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'

interface VariablesPanelProps {
  story: Story
  onUpdate: (updater: (story: Story) => Story) => void
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export function VariablesPanel({ story, onUpdate }: VariablesPanelProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingDeleteVariable = story.variables.find((v) => v.id === pendingDeleteId)

  function requestDelete(variableId: string) {
    if (countVariableUsages(story, variableId) > 0) {
      setPendingDeleteId(variableId)
    } else {
      onUpdate((s) => deleteVariable(s, variableId))
    }
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          Переменные истории
        </h3>
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          onClick={() => onUpdate((s) => addVariable(s, 'Переменная', 0, 'number').story)}
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
          {story.variables.map((variable) => {
            const type: VariableType = variable.type ?? 'number'
            return (
              <div
                key={variable.id}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900"
              >
                <input
                  value={variable.name}
                  onChange={(e) => onUpdate((s) => updateVariable(s, variable.id, { name: e.target.value }))}
                  aria-label="Имя переменной"
                  className={`${fieldClass} w-28`}
                />
                <select
                  value={type}
                  onChange={(e) => {
                    const nextType = e.target.value as VariableType
                    onUpdate((s) =>
                      updateVariable(s, variable.id, {
                        type: nextType,
                        initialValue: nextType === 'boolean' ? (variable.initialValue ? 1 : 0) : variable.initialValue,
                      }),
                    )
                  }}
                  aria-label="Тип переменной"
                  className={`${fieldClass} w-20`}
                >
                  <option value="number">Число</option>
                  <option value="boolean">Да/Нет</option>
                </select>
                <span className="text-xs text-slate-400">=</span>
                {type === 'boolean' ? (
                  <select
                    value={variable.initialValue ? '1' : '0'}
                    onChange={(e) =>
                      onUpdate((s) => updateVariable(s, variable.id, { initialValue: Number(e.target.value) }))
                    }
                    aria-label="Начальное значение"
                    className={`${fieldClass} w-16`}
                  >
                    <option value="0">Нет</option>
                    <option value="1">Да</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    value={variable.initialValue}
                    onChange={(e) =>
                      onUpdate((s) => updateVariable(s, variable.id, { initialValue: Number(e.target.value) || 0 }))
                    }
                    aria-label="Начальное значение"
                    className={`${fieldClass} w-16`}
                  />
                )}
                <button
                  onClick={() => requestDelete(variable.id)}
                  className="px-1 text-xs text-red-500 hover:text-red-600"
                  title="Удалить переменную"
                  aria-label="Удалить переменную"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pendingDeleteVariable && (
        <ConfirmDialog
          title="Удалить переменную?"
          message={`Переменная «${pendingDeleteVariable.name}» используется в условиях или эффектах вариантов (${countVariableUsages(story, pendingDeleteVariable.id)} раз). После удаления эти условия и эффекты будут сняты.`}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            onUpdate((s) => deleteVariable(s, pendingDeleteVariable.id))
            setPendingDeleteId(null)
          }}
        />
      )}
    </div>
  )
}
