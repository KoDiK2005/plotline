import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, ReactFlowProvider } from 'reactflow'
import { Button } from '../components/Button'
import { MapNode } from '../components/Player/MapNode'
import { storyToFlowEdges, storyToMapNodes } from '../engine/flowAdapters'
import { availableChoices, choose, isEnding, startPlay, type PlayState } from '../engine/play'
import { getStoryStats } from '../engine/traverse'
import type { Story } from '../types/story'
import { useLibraryStore } from '../store/useLibraryStore'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'

const nodeTypes = { mapScene: MapNode }

interface PlayerScreenInnerProps {
  story: Story
}

function PlayerScreenInner({ story }: PlayerScreenInnerProps) {
  const backToLibrary = useUIStore((s) => s.backToLibrary)
  const openEditor = useUIStore((s) => s.openEditor)

  const recordVisit = useProgressStore((s) => s.recordVisit)
  const recordEnding = useProgressStore((s) => s.recordEnding)
  const recordPlayStart = useProgressStore((s) => s.recordPlayStart)
  const progress = useProgressStore((s) => s.getProgress(story.id))

  const [playState, setPlayState] = useState<PlayState | null>(() => startPlay(story))
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    recordPlayStart(story.id)
  }, [story.id, recordPlayStart])

  useEffect(() => {
    if (!playState) return
    recordVisit(story.id, playState.currentNodeId)
    if (isEnding(story, playState)) recordEnding(story.id, playState.currentNodeId)
  }, [story, playState, recordVisit, recordEnding])

  const stats = useMemo(() => getStoryStats(story), [story])
  const mapEdges = useMemo(() => storyToFlowEdges(story), [story])
  const visitedSet = useMemo(() => new Set(progress.visitedNodeIds), [progress])
  const mapNodes = useMemo(
    () => storyToMapNodes(story, visitedSet, playState?.currentNodeId ?? null),
    [story, visitedSet, playState],
  )
  const choices = useMemo(() => (playState ? availableChoices(story, playState) : []), [story, playState])
  const ending = playState ? isEnding(story, playState) : false

  useEffect(() => {
    if (showMap || ending || choices.length === 0) return
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const index = Number(e.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= choices.length) return
      e.preventDefault()
      setPlayState((state) => (state ? choose(story, state, choices[index].id) : state))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showMap, ending, choices, story])

  if (!playState) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          В истории «{story.title}» не выбрана стартовая сцена — её нельзя сыграть.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={backToLibrary}>
            Библиотека
          </Button>
          <Button variant="primary" onClick={() => openEditor(story.id)}>
            Открыть в редакторе
          </Button>
        </div>
      </div>
    )
  }

  const node = story.nodes[playState.currentNodeId]

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Button variant="ghost" onClick={backToLibrary}>
          ← Библиотека
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {story.title}
        </h1>
        <span className="hidden text-xs text-slate-500 dark:text-slate-500 sm:inline">
          Концовок найдено: {progress.discoveredEndingIds.length}/{stats.endingCount}
        </span>
        <Button variant="ghost" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Текст' : 'Карта'}
        </Button>
        <Button variant="ghost" onClick={() => setPlayState(startPlay(story))}>
          Начать заново
        </Button>
        <Button variant="secondary" onClick={() => openEditor(story.id)}>
          Редактировать
        </Button>
      </header>

      {showMap ? (
        <div className="flex-1">
          <ReactFlow
            nodes={mapNodes}
            edges={mapEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            className="bg-slate-100 dark:bg-slate-950"
          >
            <Background />
          </ReactFlow>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{node.title}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
              {node.text}
            </p>
          </div>

          {ending ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                Конец истории
              </span>
              <Button variant="primary" onClick={() => setPlayState(startPlay(story))}>
                Сыграть заново
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => setPlayState((state) => (state ? choose(story, state, choice.id) : state))}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {index < 9 && (
                    <kbd
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500"
                    >
                      {index + 1}
                    </kbd>
                  )}
                  <span>{choice.text}</span>
                </button>
              ))}
            </div>
          )}

          {playState.history.length > 1 && (
            <details className="text-xs text-slate-500 dark:text-slate-500">
              <summary className="cursor-pointer select-none">
                Пройденный путь ({playState.history.length})
              </summary>
              <ol className="mt-2 flex list-decimal flex-col gap-0.5 pl-4">
                {playState.history.map((id, index) => (
                  <li key={`${id}-${index}`}>{story.nodes[id]?.title ?? '—'}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export function PlayerScreen() {
  const currentStoryId = useUIStore((s) => s.currentStoryId)
  const backToLibrary = useUIStore((s) => s.backToLibrary)
  const story = useLibraryStore((s) => (currentStoryId ? s.stories[currentStoryId] : undefined))

  useEffect(() => {
    if (currentStoryId && !story) backToLibrary()
  }, [currentStoryId, story, backToLibrary])

  if (!story) return null

  return (
    <ReactFlowProvider>
      <PlayerScreenInner key={story.id} story={story} />
    </ReactFlowProvider>
  )
}
