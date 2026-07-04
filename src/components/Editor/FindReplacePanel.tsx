import { useEffect, useMemo, useState } from 'react'
import type { Story } from '../../types/story'
import { findMatches, replaceAll, type MatchField } from '../../engine/findReplace'
import { Button } from '../Button'

interface FindReplacePanelProps {
  story: Story
  onUpdate: (updater: (story: Story) => Story) => void
  onJumpToNode: (nodeId: string) => void
}

const FIELD_LABELS: Record<MatchField, string> = {
  title: 'Название',
  text: 'Текст',
  choice: 'Вариант',
  notes: 'Заметки',
}

const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ' +
  'focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export function FindReplacePanel({ story, onUpdate, onJumpToNode }: FindReplacePanelProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const matches = useMemo(
    () => findMatches(story, query, { caseSensitive, wholeWord }),
    [story, query, caseSensitive, wholeWord],
  )
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    setActiveIndex(0)
  }, [query, caseSensitive, wholeWord])

  function jumpTo(index: number) {
    const match = matches[index]
    if (match) onJumpToNode(match.nodeId)
  }

  function stepNext() {
    const next = (activeIndex + 1) % matches.length
    setActiveIndex(next)
    jumpTo(next)
  }

  function stepPrev() {
    const prev = (activeIndex - 1 + matches.length) % matches.length
    setActiveIndex(prev)
    jumpTo(prev)
  }

  function handleReplaceAll() {
    if (!hasQuery || matches.length === 0) return
    onUpdate((s) => replaceAll(s, query, replacement, { caseSensitive, wholeWord }))
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти..."
          aria-label="Найти"
          className={`${fieldClass} w-48`}
        />
        {hasQuery && matches.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={stepPrev}
              aria-label="Предыдущее совпадение"
              className="rounded px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              ‹
            </button>
            <span>{activeIndex + 1} / {matches.length}</span>
            <button
              onClick={stepNext}
              aria-label="Следующее совпадение"
              className="rounded px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              ›
            </button>
          </span>
        )}
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Заменить на..."
          aria-label="Заменить на"
          className={`${fieldClass} w-48`}
        />
        <Button
          variant="secondary"
          className="px-2.5 py-1.5 text-xs"
          disabled={!hasQuery || matches.length === 0}
          onClick={handleReplaceAll}
        >
          Заменить всё{matches.length > 0 ? ` (${matches.length})` : ''}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Учитывать регистр
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
          />
          Целое слово
        </label>
      </div>

      {hasQuery && (
        matches.length === 0 ? (
          <p className="mt-2 text-xs italic text-slate-400">Совпадений не найдено.</p>
        ) : (
          <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
            {matches.map((match, index) => (
              <li
                key={`${match.nodeId}-${match.field}-${match.choiceId ?? index}`}
                className={`flex items-center justify-between gap-3 rounded px-1 text-xs ${
                  index === activeIndex ? 'bg-violet-500/10' : ''
                }`}
              >
                <span className="truncate text-slate-600 dark:text-slate-400">
                  <span className="font-medium">{story.nodes[match.nodeId]?.title || 'Без названия'}</span>
                  {' — '}
                  {FIELD_LABELS[match.field]}: «{match.snippet}»
                </span>
                <button
                  onClick={() => { setActiveIndex(index); onJumpToNode(match.nodeId) }}
                  className="shrink-0 font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  Перейти
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
