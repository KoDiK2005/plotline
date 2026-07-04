import { useEffect, useRef, useState } from 'react'
import type { Story } from '../../types/story'

interface SceneJumpPanelProps {
  story: Story
  onJump: (nodeId: string) => void
  onClose: () => void
}

export function SceneJumpPanel({ story, onJump, onClose }: SceneJumpPanelProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const nodes = Object.values(story.nodes)
  const filtered = query.trim()
    ? nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.text.toLowerCase().includes(query.toLowerCase()),
      )
    : nodes

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const node = filtered[activeIndex]
      if (node) {
        onJump(node.id)
        onClose()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Перейти к сцене…"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:text-slate-100"
        />
        <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">Ничего не найдено</li>
          )}
          {filtered.map((node, index) => (
            <li
              key={node.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex cursor-pointer flex-col px-4 py-2 text-sm ${
                index === activeIndex
                  ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              onClick={() => { onJump(node.id); onClose() }}
            >
              <span className="font-medium">{node.title || 'Без названия'}</span>
              {node.text.trim() && (
                <span className="truncate text-xs opacity-60">{node.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
