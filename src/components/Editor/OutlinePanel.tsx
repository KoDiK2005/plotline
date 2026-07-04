import { useMemo, useState } from 'react'
import type { Story } from '../../types/story'
import { reachableNodeIds, getEndingNodeIds } from '../../engine/traverse'

interface OutlinePanelProps {
  story: Story
  selectedNodeId: string | null
  onJumpToNode: (nodeId: string) => void
}

export function OutlinePanel({ story, selectedNodeId, onJumpToNode }: OutlinePanelProps) {
  const [filter, setFilter] = useState('')
  const reachable = useMemo(() => reachableNodeIds(story), [story])
  const endings = useMemo(() => new Set(getEndingNodeIds(story)), [story])

  const nodes = useMemo(() => {
    const all = Object.values(story.nodes)
    const q = filter.trim().toLowerCase()
    return q
      ? all.filter((n) => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
      : all
  }, [story.nodes, filter])

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
          Структура ({nodes.length})
        </p>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Фильтр…"
          className="w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-slate-700"
        />
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId
          const isStart = node.id === story.startNodeId
          const isEnding = endings.has(node.id)
          const isUnreachable = !reachable.has(node.id)
          return (
            <li key={node.id}>
              <button
                onClick={() => onJumpToNode(node.id)}
                className={`w-full px-3 py-1.5 text-left text-xs ${
                  isSelected
                    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-1">
                  {isStart && <span title="Стартовая сцена" className="text-emerald-500">★</span>}
                  {isEnding && <span title="Концовка" className="text-violet-500">🏁</span>}
                  {isUnreachable && <span title="Недостижима" className="text-amber-500">⚠</span>}
                  <span className="truncate">{node.title || 'Без названия'}</span>
                </span>
              </button>
            </li>
          )
        })}
        {nodes.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-slate-400">Ничего не найдено</li>
        )}
      </ul>
    </div>
  )
}
