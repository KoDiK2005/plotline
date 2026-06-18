import { useId, useState } from 'react'
import type { Story } from '../../types/story'
import { availableChoices, choose, isEnding, startPlay, type PlayState } from '../../engine/play'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import { Button } from '../Button'

interface PreviewPanelProps {
  story: Story
  startNodeId: string
  onClose: () => void
}

export function PreviewPanel({ story, startNodeId, onClose }: PreviewPanelProps) {
  const [playState, setPlayState] = useState<PlayState | null>(() => startPlay(story, startNodeId))
  const titleId = useId()
  const dialogRef = useDialogA11y(onClose)

  if (!playState) return null

  const node = story.nodes[playState.currentNodeId]
  const choices = availableChoices(story, playState)
  const ending = isEnding(story, playState)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-5 shadow-xl outline-none dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id={titleId}
            className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500"
          >
            Превью
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть превью"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{node.title}</h3>
          {node.text ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {node.text}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-slate-400">Текст сцены пуст.</p>
          )}

          {ending ? (
            <div className="mt-5 flex justify-center">
              <span className="rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                Конец ветки
              </span>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => setPlayState((state) => (state ? choose(story, state, choice.id) : state))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPlayState(startPlay(story, startNodeId))}>
            Начать заново
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}
