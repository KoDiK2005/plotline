import { Handle, Position, type NodeProps } from 'reactflow'
import type { SceneNodeData } from '../../engine/flowAdapters'

export function SceneNode({ data, selected }: NodeProps<SceneNodeData>) {
  const borderClass = selected
    ? 'border-violet-500'
    : data.isStart
      ? 'border-emerald-500'
      : 'border-slate-300 dark:border-slate-700'

  return (
    <div className={`w-64 rounded-xl border-2 bg-white text-left shadow-sm dark:bg-slate-900 ${borderClass}`}>
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
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {data.title || 'Без названия'}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-500">
          {data.text || 'Нет текста…'}
        </p>
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
}
