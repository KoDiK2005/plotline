import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatPill } from '../components/StatPill'
import { DescriptionPanel } from '../components/Editor/DescriptionPanel'
import { FindReplacePanel } from '../components/Editor/FindReplacePanel'
import { IssuesPanel } from '../components/Editor/IssuesPanel'
import { NodeInspector } from '../components/Editor/NodeInspector'
import { PreviewPanel } from '../components/Editor/PreviewPanel'
import { SceneNode } from '../components/Editor/SceneNode'
import { VariablesPanel } from '../components/Editor/VariablesPanel'
import type { SceneNodeData } from '../engine/flowAdapters'
import { storyToFlowEdges, storyToFlowNodes } from '../engine/flowAdapters'
import { addNode, applyPositions, deleteNode, duplicateNode, linkChoice, moveNode, updateMeta } from '../engine/storyOps'
import { autoLayoutPositions, getStoryStats } from '../engine/traverse'
import { validateStory } from '../engine/validate'
import { useLibraryStore } from '../store/useLibraryStore'
import { useUIStore } from '../store/useUIStore'
import { downloadJson, slugifyFilename } from '../utils/file'
import type { Story } from '../types/story'

const nodeTypes = { scene: SceneNode }

// Rapid edits within this window (e.g. typing in a text field) collapse into a single undo step.
const HISTORY_GROUP_MS = 600

function EditorScreenInner() {
  const currentStoryId = useUIStore((s) => s.currentStoryId)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const selectNode = useUIStore((s) => s.selectNode)
  const backToLibrary = useUIStore((s) => s.backToLibrary)
  const openPlayer = useUIStore((s) => s.openPlayer)

  const story = useLibraryStore((s) => (currentStoryId ? s.stories[currentStoryId] : undefined))
  const updateStory = useLibraryStore((s) => s.updateStory)

  const [nodes, setNodes] = useNodesState<SceneNodeData>([])
  const [edges, setEdges] = useEdgesState<Edge>([])
  const [showIssues, setShowIssues] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null)
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null)

  const [past, setPast] = useState<Story[]>([])
  const [future, setFuture] = useState<Story[]>([])
  const lastMutationAtRef = useRef(0)

  useEffect(() => {
    if (!story) return
    setNodes(storyToFlowNodes(story))
    setEdges(storyToFlowEdges(story))
  }, [story, setNodes, setEdges])

  useEffect(() => {
    if (currentStoryId && !story) backToLibrary()
  }, [currentStoryId, story, backToLibrary])

  const mutate = useCallback(
    (updater: (s: Story) => Story) => {
      if (!currentStoryId) return
      const current = useLibraryStore.getState().stories[currentStoryId]
      if (!current) return
      const now = Date.now()
      if (now - lastMutationAtRef.current > HISTORY_GROUP_MS) {
        setPast((p) => [...p, current])
        setFuture([])
      }
      lastMutationAtRef.current = now
      updateStory(currentStoryId, updater)
    },
    [currentStoryId, updateStory],
  )

  const undo = useCallback(() => {
    if (!currentStoryId || past.length === 0) return
    const current = useLibraryStore.getState().stories[currentStoryId]
    if (!current) return
    const previous = past[past.length - 1]
    setPast(past.slice(0, -1))
    setFuture([current, ...future])
    lastMutationAtRef.current = 0
    updateStory(currentStoryId, () => previous)
  }, [currentStoryId, past, future, updateStory])

  const redo = useCallback(() => {
    if (!currentStoryId || future.length === 0) return
    const current = useLibraryStore.getState().stories[currentStoryId]
    if (!current) return
    const next = future[0]
    setFuture(future.slice(1))
    setPast([...past, current])
    lastMutationAtRef.current = 0
    updateStory(currentStoryId, () => next)
  }, [currentStoryId, future, past, updateStory])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removals = changes.filter((c) => c.type === 'remove')
      removals.forEach((change) => mutate((s) => deleteNode(s, change.id)))
      const rest = changes.filter((c) => c.type !== 'remove')
      if (rest.length > 0) setNodes((nds) => applyNodeChanges(rest, nds))
    },
    [mutate, setNodes],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removals = changes.filter((c) => c.type === 'remove')
      for (const change of removals) {
        const edge = edges.find((e) => e.id === change.id)
        if (edge?.sourceHandle) {
          mutate((s) => linkChoice(s, edge.source, edge.sourceHandle!, null))
        }
      }
      if (removals.length === 0) setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [edges, mutate, setEdges],
  )

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      mutate((s) => moveNode(s, node.id, node.position))
    },
    [mutate],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle) return
      mutate((s) => linkChoice(s, connection.source!, connection.sourceHandle!, connection.target!))
    },
    [mutate],
  )

  const issues = useMemo(() => (story ? validateStory(story) : []), [story])
  const stats = useMemo(() => (story ? getStoryStats(story) : null), [story])
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.length - errorCount

  if (!story || !stats) return null

  const currentStory = story

  function jumpToNode(nodeId: string) {
    selectNode(nodeId)
    setShowIssues(false)
  }

  function handleAddNode() {
    const count = Object.keys(currentStory.nodes).length
    let newNodeId = ''
    mutate((s) => {
      const { story: nextStory, nodeId } = addNode(s, { x: 40 * count, y: 40 * count })
      newNodeId = nodeId
      return nextStory
    })
    selectNode(newNodeId)
  }

  function handleDuplicateNode(nodeId: string) {
    let copyId: string | null = null
    mutate((s) => {
      const { story: nextStory, nodeId: newNodeId } = duplicateNode(s, nodeId)
      copyId = newNodeId
      return nextStory
    })
    if (copyId) selectNode(copyId)
  }

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Button variant="ghost" onClick={backToLibrary}>
          ← Библиотека
        </Button>
        <input
          value={story.title}
          onChange={(e) => mutate((s) => updateMeta(s, { title: e.target.value }))}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-violet-500 dark:text-slate-100 dark:hover:border-slate-700"
        />
        <div className="hidden gap-1.5 sm:flex">
          <StatPill label="сцен" value={stats.nodeCount} />
          <StatPill label="концовок" value={stats.endingCount} />
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" disabled={!canUndo} onClick={undo} title="Отменить (Ctrl+Z)" aria-label="Отменить">
            ↶
          </Button>
          <Button
            variant="ghost"
            disabled={!canRedo}
            onClick={redo}
            title="Повторить (Ctrl+Shift+Z)"
            aria-label="Повторить"
          >
            ↷
          </Button>
        </div>
        <button
          onClick={() => setShowIssues((v) => !v)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
            errorCount > 0
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : warningCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {issues.length === 0 ? '✓ Готово' : `${issues.length} замечани${issues.length === 1 ? 'е' : 'й'}`}
        </button>
        <Button
          variant="ghost"
          onClick={() => mutate((s) => applyPositions(s, autoLayoutPositions(s)))}
        >
          Авторасстановка
        </Button>
        <Button
          variant="ghost"
          disabled={!story.startNodeId}
          onClick={() => story.startNodeId && jumpToNode(story.startNodeId)}
          title="Перейти к стартовой сцене"
        >
          ★ К старту
        </Button>
        <Button variant="ghost" onClick={() => setShowDescription((v) => !v)}>
          Описание
        </Button>
        <Button variant="ghost" onClick={() => setShowVariables((v) => !v)}>
          Переменные{story.variables.length > 0 ? ` (${story.variables.length})` : ''}
        </Button>
        <Button variant="ghost" onClick={() => setShowFindReplace((v) => !v)}>
          🔍 Найти и заменить
        </Button>
        <Button variant="ghost" onClick={() => downloadJson(`${slugifyFilename(story.title)}.json`, story)}>
          Экспорт
        </Button>
        <Button variant="primary" onClick={() => openPlayer(story.id)}>
          ▶ Играть
        </Button>
      </header>

      {showIssues && <IssuesPanel issues={issues} onUpdate={mutate} onJumpToNode={jumpToNode} />}
      {showDescription && <DescriptionPanel story={story} onUpdate={mutate} />}
      {showVariables && <VariablesPanel story={story} onUpdate={mutate} />}
      {showFindReplace && <FindReplacePanel story={story} onUpdate={mutate} onJumpToNode={jumpToNode} />}

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            fitView
            className="bg-slate-100 dark:bg-slate-950"
          >
            <Background />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="dark:!bg-slate-900" />
          </ReactFlow>

          <Button variant="primary" className="absolute left-4 top-4 shadow-md" onClick={handleAddNode}>
            + Добавить сцену
          </Button>
        </div>

        {selectedNodeId && story.nodes[selectedNodeId] && (
          <NodeInspector
            story={story}
            nodeId={selectedNodeId}
            onUpdate={mutate}
            onClose={() => selectNode(null)}
            onRequestDelete={() => setConfirmDeleteNodeId(selectedNodeId)}
            onPreview={() => setPreviewNodeId(selectedNodeId)}
            onDuplicate={() => handleDuplicateNode(selectedNodeId)}
            onJumpToNode={jumpToNode}
          />
        )}
      </div>

      {confirmDeleteNodeId && (
        <ConfirmDialog
          title="Удалить сцену?"
          message="Все варианты выбора, ведущие в эту сцену, останутся без связи."
          onCancel={() => setConfirmDeleteNodeId(null)}
          onConfirm={() => {
            mutate((s) => deleteNode(s, confirmDeleteNodeId))
            selectNode(null)
            setConfirmDeleteNodeId(null)
          }}
        />
      )}

      {previewNodeId && story.nodes[previewNodeId] && (
        <PreviewPanel story={story} startNodeId={previewNodeId} onClose={() => setPreviewNodeId(null)} />
      )}
    </div>
  )
}

export function EditorScreen() {
  return (
    <ReactFlowProvider>
      <EditorScreenInner />
    </ReactFlowProvider>
  )
}
