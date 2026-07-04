import type { Edge, Node } from 'reactflow'
import type { Choice, NodeColor, Story, StoryNode } from '../types/story'
import { getEndingNodeIds, nodesWithPathToEnding, reachableNodeIds } from './traverse'
import { countWords } from './readingTime'

export interface SceneNodeData {
  title: string
  text: string
  isStart: boolean
  isUnreachable: boolean
  isEnding: boolean
  isStuck: boolean
  wordCount: number
  hasNotes: boolean
  color?: NodeColor
  choices: { id: string; text: string; linked: boolean; conditional: boolean; hasEffects: boolean }[]
}

// Keyed by StoryNode reference: storyOps applies updates immutably, so a node
// untouched by an edit keeps its old object reference and can reuse the flow
// node we built for it last time. This keeps unaffected scene cards from
// re-rendering on every keystroke in the editor, which matters once a story
// has hundreds of nodes.
const flowNodeCache = new WeakMap<
  StoryNode,
  { isStart: boolean; isUnreachable: boolean; isEnding: boolean; isStuck: boolean; flowNode: Node<SceneNodeData> }
>()

export function storyToFlowNodes(story: Story): Node<SceneNodeData>[] {
  const reachable = reachableNodeIds(story)
  const endings = new Set(getEndingNodeIds(story))
  const canFinish = nodesWithPathToEnding(story)
  return Object.values(story.nodes).map((node) => {
    const isStart = node.id === story.startNodeId
    const isUnreachable = !reachable.has(node.id)
    const isEnding = endings.has(node.id)
    const isStuck = reachable.has(node.id) && !isEnding && !canFinish.has(node.id)

    const cached = flowNodeCache.get(node)
    if (
      cached &&
      cached.isStart === isStart &&
      cached.isUnreachable === isUnreachable &&
      cached.isEnding === isEnding &&
      cached.isStuck === isStuck
    ) {
      return cached.flowNode
    }

    const flowNode: Node<SceneNodeData> = {
      id: node.id,
      type: 'scene',
      position: node.position,
      data: {
        title: node.title,
        text: node.text,
        isStart,
        isUnreachable,
        isEnding,
        isStuck,
        wordCount: countWords(node.text),
        hasNotes: node.notes.trim().length > 0,
        color: node.color,
        choices: node.choices.map((c) => ({
          id: c.id,
          text: c.text,
          linked: c.targetNodeId !== null,
          conditional: c.condition !== null,
          hasEffects: c.effects.length > 0,
        })),
      },
    }
    flowNodeCache.set(node, { isStart, isUnreachable, isEnding, isStuck, flowNode })
    return flowNode
  })
}

export type MapNodeStatus = 'current' | 'visited' | 'unvisited'

export interface MapNodeData {
  title: string
  isStart: boolean
  status: MapNodeStatus
  choiceIds: string[]
}

// Keyed by StoryNode reference, same rationale as flowNodeCache above: the
// player advances by calling choose(), which only ever touches PlayState,
// never the Story, so without this every choice would otherwise rebuild (and
// re-render) every map node just to update the one or two whose status
// actually changed.
const mapNodeCache = new WeakMap<
  StoryNode,
  { isStart: boolean; status: MapNodeStatus; mapNode: Node<MapNodeData> }
>()

export function storyToMapNodes(
  story: Story,
  visitedNodeIds: Set<string>,
  currentNodeId: string | null,
): Node<MapNodeData>[] {
  return Object.values(story.nodes).map((node) => {
    const isStart = node.id === story.startNodeId
    const status: MapNodeStatus =
      node.id === currentNodeId ? 'current' : visitedNodeIds.has(node.id) ? 'visited' : 'unvisited'

    const cached = mapNodeCache.get(node)
    if (cached && cached.isStart === isStart && cached.status === status) {
      return cached.mapNode
    }

    const mapNode: Node<MapNodeData> = {
      id: node.id,
      type: 'mapScene',
      position: node.position,
      draggable: false,
      data: {
        title: node.title,
        isStart,
        status,
        choiceIds: node.choices.map((c) => c.id),
      },
    }
    mapNodeCache.set(node, { isStart, status, mapNode })
    return mapNode
  })
}

// Keyed by Choice reference: a choice's source node, target and condition are
// all read off the choice object itself, so an unchanged choice always maps to
// the same edge and can be reused instead of rebuilt.
const flowEdgeCache = new WeakMap<Choice, Edge>()

export function storyToFlowEdges(story: Story): Edge[] {
  const edges: Edge[] = []
  for (const node of Object.values(story.nodes)) {
    for (const choice of node.choices) {
      if (choice.targetNodeId && story.nodes[choice.targetNodeId]) {
        const cached = flowEdgeCache.get(choice)
        if (cached) {
          edges.push(cached)
          continue
        }
        const edge: Edge = {
          id: choice.id,
          source: node.id,
          sourceHandle: choice.id,
          target: choice.targetNodeId,
          targetHandle: 'target',
          label: choice.condition ? `🔒 ${choice.text || '…'}` : choice.text || '…',
          type: 'smoothstep',
          style: choice.condition ? { strokeDasharray: '5 4' } : undefined,
        }
        flowEdgeCache.set(choice, edge)
        edges.push(edge)
      }
    }
  }
  return edges
}
