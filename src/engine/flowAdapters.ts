import type { Edge, Node } from 'reactflow'
import type { Story } from '../types/story'
import { getEndingNodeIds, reachableNodeIds } from './traverse'
import { countWords } from './readingTime'

export interface SceneNodeData {
  title: string
  text: string
  isStart: boolean
  isUnreachable: boolean
  isEnding: boolean
  wordCount: number
  choices: { id: string; text: string; linked: boolean; conditional: boolean; hasEffects: boolean }[]
}

export function storyToFlowNodes(story: Story): Node<SceneNodeData>[] {
  const reachable = reachableNodeIds(story)
  const endings = new Set(getEndingNodeIds(story))
  return Object.values(story.nodes).map((node) => ({
    id: node.id,
    type: 'scene',
    position: node.position,
    data: {
      title: node.title,
      text: node.text,
      isStart: node.id === story.startNodeId,
      isUnreachable: !reachable.has(node.id),
      isEnding: endings.has(node.id),
      wordCount: countWords(node.text),
      choices: node.choices.map((c) => ({
        id: c.id,
        text: c.text,
        linked: c.targetNodeId !== null,
        conditional: c.condition !== null,
        hasEffects: c.effects.length > 0,
      })),
    },
  }))
}

export type MapNodeStatus = 'current' | 'visited' | 'unvisited'

export interface MapNodeData {
  title: string
  isStart: boolean
  status: MapNodeStatus
  choiceIds: string[]
}

export function storyToMapNodes(
  story: Story,
  visitedNodeIds: Set<string>,
  currentNodeId: string | null,
): Node<MapNodeData>[] {
  return Object.values(story.nodes).map((node) => ({
    id: node.id,
    type: 'mapScene',
    position: node.position,
    draggable: false,
    data: {
      title: node.title,
      isStart: node.id === story.startNodeId,
      status: node.id === currentNodeId ? 'current' : visitedNodeIds.has(node.id) ? 'visited' : 'unvisited',
      choiceIds: node.choices.map((c) => c.id),
    },
  }))
}

export function storyToFlowEdges(story: Story): Edge[] {
  const edges: Edge[] = []
  for (const node of Object.values(story.nodes)) {
    for (const choice of node.choices) {
      if (choice.targetNodeId && story.nodes[choice.targetNodeId]) {
        edges.push({
          id: choice.id,
          source: node.id,
          sourceHandle: choice.id,
          target: choice.targetNodeId,
          targetHandle: 'target',
          label: choice.condition ? `🔒 ${choice.text || '…'}` : choice.text || '…',
          type: 'smoothstep',
          style: choice.condition ? { strokeDasharray: '5 4' } : undefined,
        })
      }
    }
  }
  return edges
}
