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
import { useRatingStore } from '../store/useRatingStore'
import { useUIStore } from '../store/useUIStore'
import { downloadText, slugifyFilename } from '../utils/file'


const nodeTypes = { mapScene: MapNode }

interface PlayerScreenInnerProps {
  story: Story
}

function PlayerScreenInner({ story }: PlayerScreenInnerProps) {
  const backToLibrary = useUIStore((s) => s.backToLibrary)
  const openEditor = useUIStore((s) => s.openEditor)

  const recordVisit = useProgressStore((s) => s.recordVisit)
  const recordChoice = useProgressStore((s) => s.recordChoice)
  const recordEnding = useProgressStore((s) => s.recordEnding)
  const recordPlayStart = useProgressStore((s) => s.recordPlayStart)
  const savePlayState = useProgressStore((s) => s.savePlayState)
  const clearProgress = useProgressStore((s) => s.clearProgress)
  const progress = useProgressStore((s) => s.getProgress(story.id))
  const recordView = useRatingStore((s) => s.recordView)

  const [playState, setPlayState] = useState<PlayState | null>(() => progress.savedPlay ?? startPlay(story))
  const [playStateStack, setPlayStateStack] = useState<PlayState[]>([])
  const [showMap, setShowMap] = useState(false)
  const [showResumed] = useState(() => (progress.savedPlay?.history.length ?? 0) > 1)
  const [isNewDiscovery, setIsNewDiscovery] = useState(false)

  useEffect(() => {
    const prev = document.title
    const currentNode = playState ? story.nodes[playState.currentNodeId] : null
    const sceneTitle = currentNode?.title?.trim()
    document.title = sceneTitle
      ? `${sceneTitle} · ${story.title} — Plotline`
      : `${story.title} — Plotline`
    return () => { document.title = prev }
  }, [story.title, story.nodes, playState?.currentNodeId])

  useEffect(() => {
    recordPlayStart(story.id)
    void recordView(story.id, { title: story.title, authorName: story.author, writerId: story.writerId })
  }, [story, recordPlayStart, recordView])

  useEffect(() => {
    if (!playState) return
    recordVisit(story.id, playState.currentNodeId)
    if (isEnding(story, playState)) {
      const wasNew = !useProgressStore.getState().getProgress(story.id).discoveredEndingIds.includes(playState.currentNodeId)
      setIsNewDiscovery(wasNew)
      recordEnding(story.id, playState.currentNodeId)
      savePlayState(story.id, null)
    } else {
      setIsNewDiscovery(false)
      savePlayState(story.id, playState)
    }
  }, [story, playState, recordVisit, recordEnding, savePlayState])

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
    if (showMap) return
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'b') {
          setPlayStateStack((s) => {
            if (s.length === 0) return s
            const prev = s[s.length - 1]
            setIsNewDiscovery(false)
            setPlayState(prev)
            return s.slice(0, -1)
          })
          return
        }
        if (e.key.toLowerCase() === 'r') {
          setIsNewDiscovery(false)
          setPlayState(startPlay(story))
          setPlayStateStack([])
          return
        }
      }
      if (ending || choices.length === 0) return
      const index = Number(e.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= choices.length) return
      e.preventDefault()
      recordChoice(story.id, choices[index].id)
      setPlayState((state) => {
        if (!state) return state
        setPlayStateStack((s) => [...s, state])
        return choose(story, state, choices[index].id)
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showMap, ending, choices, story, recordChoice])

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

  function buildTranscript() {
    const lines: string[] = [`${story.title}\n`]
    playState!.history.forEach((nodeId, index) => {
      const n = story.nodes[nodeId]
      if (!n) return
      lines.push(`=== ${n.title || 'Сцена ' + (index + 1)} ===`)
      if (n.text) lines.push(n.text)
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }

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
          Концовок: {progress.discoveredEndingIds.length}/{stats.endingCount}
        </span>
        {stats.reachableCount > 0 && (
          <span
            className="hidden text-xs text-slate-500 dark:text-slate-500 sm:inline"
            title="Сцен посещено"
          >
            Сцен: {visitedSet.size}/{stats.reachableCount}
          </span>
        )}
        <Button variant="ghost" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Текст' : 'Карта'}
        </Button>
        {playStateStack.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              const prev = playStateStack[playStateStack.length - 1]
              setPlayStateStack((s) => s.slice(0, -1))
              setIsNewDiscovery(false)
              setPlayState(prev)
            }}
            title="Вернуться на предыдущий шаг"
          >
            ← Назад
          </Button>
        )}
        <Button variant="ghost" onClick={() => { setIsNewDiscovery(false); setPlayState(startPlay(story)); setPlayStateStack([]) }}>
          Начать заново
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clearProgress(story.id)
            setIsNewDiscovery(false)
            setPlayState(startPlay(story))
            setPlayStateStack([])
          }}
          title="Сбросить весь прогресс (посещённые сцены, концовки, статистику)"
        >
          Сброс прогресса
        </Button>
        {playState.history.length > 1 && (
          <Button
            variant="ghost"
            onClick={() => downloadText(`${slugifyFilename(story.title)}-transcript.txt`, buildTranscript(), 'text/plain')}
            title="Скачать транскрипт этого прохождения"
          >
            Транскрипт
          </Button>
        )}
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
            onlyRenderVisibleElements
            className="bg-slate-100 dark:bg-slate-950"
          >
            <Background />
          </ReactFlow>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-8">
          {showResumed && (
            <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-600 dark:text-violet-400">
              ↻ Продолжаем с места, где вы остановились в прошлый раз.
            </p>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{node.title}</h2>
              {playState.history.length > 1 && (
                <span
                  title="Шаг в текущем прохождении"
                  className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                >
                  {playState.history.length}
                </span>
              )}
            </div>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
              {node.text}
            </p>
          </div>

          {ending ? (
            <div className="flex flex-col items-center gap-3 text-center">
              {isNewDiscovery && (
                <span className="rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  ✦ Новая концовка!
                </span>
              )}
              <span className="rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                Конец истории
              </span>
              <div className="flex gap-2">
                {playStateStack.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const prev = playStateStack[playStateStack.length - 1]
                      setPlayStateStack((s) => s.slice(0, -1))
                      setIsNewDiscovery(false)
                      setPlayState(prev)
                    }}
                  >
                    ← Назад
                  </Button>
                )}
                <Button variant="primary" onClick={() => { setIsNewDiscovery(false); setPlayState(startPlay(story)); setPlayStateStack([]) }}>
                  Сыграть заново
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => {
                    recordChoice(story.id, choice.id)
                    setPlayState((state) => {
                      if (!state) return state
                      setPlayStateStack((s) => [...s, state])
                      return choose(story, state, choice.id)
                    })
                  }}
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
                  <span className="flex-1">{choice.text}</span>
                  {progress.visitedChoiceIds.includes(choice.id) && (
                    <span
                      title="Уже выбирали"
                      aria-hidden="true"
                      className="shrink-0 text-xs text-violet-500 dark:text-violet-400"
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {story.variables.length > 0 && (
            <details className="text-xs text-slate-500 dark:text-slate-500">
              <summary className="cursor-pointer select-none">Переменные</summary>
              <dl className="mt-2 flex flex-col gap-0.5">
                {story.variables.map((v) => (
                  <div key={v.id} className="flex gap-2">
                    <dt className="font-medium text-slate-700 dark:text-slate-300">{v.name}</dt>
                    <dd>
                      {v.type === 'boolean'
                        ? playState.variables[v.id] === 1
                          ? 'Да'
                          : 'Нет'
                        : (playState.variables[v.id] ?? v.initialValue)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          {playState.history.length > 1 && (
            <details className="text-xs text-slate-500 dark:text-slate-500">
              <summary className="cursor-pointer select-none">
                Пройденный путь ({playState.history.length})
              </summary>
              <ol className="mt-2 flex list-decimal flex-col gap-0.5 pl-4">
                {playState.history.map((id, index) => {
                  const isPast = index < playState.history.length - 1
                  const canJump = isPast && playStateStack.length === playState.history.length - 1
                  return (
                    <li key={`${id}-${index}`}>
                      {canJump ? (
                        <button
                          className="text-left hover:text-violet-600 hover:underline dark:hover:text-violet-400"
                          title="Перейти к этой сцене"
                          onClick={() => {
                            setIsNewDiscovery(false)
                            setPlayState(playStateStack[index])
                            setPlayStateStack(playStateStack.slice(0, index))
                          }}
                        >
                          {story.nodes[id]?.title ?? '—'}
                        </button>
                      ) : (
                        <span className={isPast ? '' : 'font-medium text-slate-700 dark:text-slate-300'}>
                          {story.nodes[id]?.title ?? '—'}
                        </span>
                      )}
                    </li>
                  )
                })}
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
