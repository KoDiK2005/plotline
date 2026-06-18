import { Handle, Position, type NodeProps } from 'reactflow'
import type { MapNodeData, MapNodeStatus } from '../../engine/flowAdapters'

const statusClass: Record<MapNodeStatus, string> = {
  current: 'border-violet-500 bg-violet-500/10 text-slate-900 dark:text-slate-100',
  visited: 'border-sky-400 bg-sky-400/10 text-slate-700 dark:text-slate-200',
  unvisited:
    'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600',
}

export function MapNode({ data }: NodeProps<MapNodeData>) {
  return (
    <div className={`w-48 rounded-lg border-2 px-3 py-2 text-xs font-medium ${statusClass[data.status]}`}>
      <Handle type="target" id="target" position={Position.Left} className="!opacity-0" />
      {data.isStart && <div className="mb-0.5 text-[9px] uppercase tracking-wide opacity-70">Старт</div>}
      <div className="truncate">{data.title || 'Без названия'}</div>
      {data.status === 'current' && (
        <div className="mt-0.5 text-[9px] uppercase tracking-wide">Вы здесь</div>
      )}
      {data.choiceIds.map((choiceId) => (
        <Handle key={choiceId} type="source" id={choiceId} position={Position.Right} className="!opacity-0" />
      ))}
    </div>
  )
}
