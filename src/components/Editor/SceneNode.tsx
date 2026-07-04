import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { NodeColor } from '../../types/story'
import type { SceneNodeData } from '../../engine/flowAdapters'

function wordCountLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return 'слов'
  if (mod10 === 1) return 'слово'
  if (mod10 >= 2 && mod10 <= 4) return 'слова'
  return 'слов'
}

const COLOR_STRIPE: Record<NodeColor, string> = {
  violet: 'bg-violet-400',
  blue: 'bg-blue-400',
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
}

export const SceneNode = memo(function SceneNode({ data, selected }: NodeProps<SceneNodeData>) {
  const borderClass = selected
    ? 'border-violet-500'
    : data.isStart
      ? 'border-emerald-500'
      : 'border-slate-300 dark:border-slate-700'

  return (
    <div className={`w-64 overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm dark:bg-slate-900 ${borderClass}`}>
      {data.color && (
        <div className={`h-1 w-full ${COLOR_STRIPE[data.color]}`} aria-hidden="true" />
      )}
      <Handle type="target" id="target" position={Position.Left} className="!h-3 !w-3 !bg-slate-400" />

      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        {data.isStart && (
          <span className="mb-1 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
            Старт
          </span>
        )}
        {data.isUnreachable && (
          <span
            title="Недостижима из начала истории"
            className="mb-1 ml-1 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400"
          >
            ⚠ Недостижима
          </span>
        )}
        {data.isEnding && (
          <span
            title="У этой сцены нет рабочих переходов — это концовка"
            className="mb-1 ml-1 inline-block rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-400"
          >
            🏁 Концовка
          </span>
        )}
        {data.isStuck && (
          <span
            title="Из этой сцены невозможно добраться до концовки"
            className="mb-1 ml-1 inline-block rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400"
          >
            ⛔ Тупик
          </span>
        )}
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {data.title || 'Без названия'}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-500">
          {data.text || 'Нет текста…'}
        </p>
        <div className="mt-1 flex items-center justify-between">
          {data.hasNotes ? (
            <span
              title="Есть заметки автора"
              className="text-[10px] text-violet-400 dark:text-violet-500"
              aria-label="Есть заметки автора"
            >
              ✏
            </span>
          ) : <span />}
          <p
            title="Количество слов в тексте сцены"
            className="text-right text-[10px] text-slate-400 dark:text-slate-600"
          >
            {data.wordCount} {wordCountLabel(data.wordCount)}
          </p>
        </div>
      </div>

      {data.choices.length === 0 ? (
        <p className="px-3 py-2 text-xs italic text-slate-400">Конец истории</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.choices.map((choice) => (
            <div key={choice.id} className="relative flex items-center gap-1 px-3 py-1.5 pr-5 text-xs">
              {choice.conditional && <span title="Есть условие">🔒</span>}
              {choice.hasEffects && <span title="Меняет переменные">⚡</span>}
              <span
                className={`truncate ${
                  choice.linked ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {choice.text || 'Без текста'}
              </span>
              <Handle
                type="source"
                id={choice.id}
                position={Position.Right}
                className="!h-3 !w-3 !bg-violet-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
