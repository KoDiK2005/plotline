import type { Story } from '../types/story'
import { countWords } from './readingTime'

function outgoingTargets(story: Story, nodeId: string): string[] {
  const node = story.nodes[nodeId]
  if (!node) return []
  return node.choices
    .map((c) => c.targetNodeId)
    .filter((id): id is string => id !== null && id in story.nodes)
}

// Keyed by Story reference: storyOps always produces a new top-level Story
// object on every edit, so caching keyed on it is safe and lets repeated BFS
// passes over the same story version (stats, validation, flow adapters,
// reading time, library filtering) share one computation instead of each
// re-walking the graph.
const reachableDepthsCache = new WeakMap<Story, Map<string, number>>()

/** Breadth-first distance (in scenes) from the start node to every reachable node. */
export function reachableDepths(story: Story): Map<string, number> {
  const cached = reachableDepthsCache.get(story)
  if (cached) return cached

  const depths = new Map<string, number>()
  if (story.startNodeId && story.nodes[story.startNodeId]) {
    const queue: string[] = [story.startNodeId]
    depths.set(story.startNodeId, 0)
    while (queue.length > 0) {
      const current = queue.shift()!
      const depth = depths.get(current)!
      for (const target of outgoingTargets(story, current)) {
        if (!depths.has(target)) {
          depths.set(target, depth + 1)
          queue.push(target)
        }
      }
    }
  }
  reachableDepthsCache.set(story, depths)
  return depths
}

export function reachableNodeIds(story: Story): Set<string> {
  return new Set(reachableDepths(story).keys())
}

const endingNodeIdsCache = new WeakMap<Story, string[]>()

export function getEndingNodeIds(story: Story): string[] {
  const cached = endingNodeIdsCache.get(story)
  if (cached) return cached

  const endings = Object.values(story.nodes)
    .filter((node) => outgoingTargets(story, node.id).length === 0)
    .map((node) => node.id)
  endingNodeIdsCache.set(story, endings)
  return endings
}

export interface StoryStats {
  nodeCount: number
  choiceCount: number
  linkedChoiceCount: number
  danglingChoiceCount: number
  endingCount: number
  reachableCount: number
  unreachableCount: number
  maxDepth: number
  averageBranching: number
  wordCount: number
}

export function getStoryStats(story: Story): StoryStats {
  const nodes = Object.values(story.nodes)
  const choiceCount = nodes.reduce((sum, n) => sum + n.choices.length, 0)
  const linkedChoiceCount = nodes.reduce(
    (sum, n) => sum + n.choices.filter((c) => c.targetNodeId !== null).length,
    0,
  )
  const depths = reachableDepths(story)
  const endings = getEndingNodeIds(story)
  const nonEndingCount = nodes.length - endings.length

  const reachable = depths
  const wordCount = nodes
    .filter((n) => reachable.has(n.id))
    .reduce((sum, n) => sum + countWords(n.text), 0)

  return {
    nodeCount: nodes.length,
    choiceCount,
    linkedChoiceCount,
    danglingChoiceCount: choiceCount - linkedChoiceCount,
    endingCount: endings.length,
    reachableCount: depths.size,
    unreachableCount: Math.max(0, nodes.length - depths.size),
    maxDepth: depths.size > 0 ? Math.max(...depths.values()) : 0,
    averageBranching: nonEndingCount > 0 ? linkedChoiceCount / nonEndingCount : 0,
    wordCount,
  }
}

const COLUMN_WIDTH = 320
const ROW_HEIGHT = 160

/**
 * Lays nodes out left-to-right by BFS depth from the start node. Nodes that
 * cannot be reached from the start are placed in a row below the graph so
 * authors can spot and reconnect them.
 */
export function autoLayoutPositions(story: Story): Record<string, { x: number; y: number }> {
  const depths = reachableDepths(story)
  const byDepth = new Map<number, string[]>()
  for (const [id, depth] of depths) {
    const list = byDepth.get(depth) ?? []
    list.push(id)
    byDepth.set(depth, list)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b)
  let maxDepthRowCount = 0
  for (const depth of sortedDepths) {
    const ids = byDepth.get(depth)!
    maxDepthRowCount = Math.max(maxDepthRowCount, ids.length)
    ids.forEach((id, index) => {
      positions[id] = { x: depth * COLUMN_WIDTH, y: index * ROW_HEIGHT }
    })
  }

  const unreachable = Object.keys(story.nodes).filter((id) => !depths.has(id))
  const orphanRowY = (maxDepthRowCount + 1) * ROW_HEIGHT
  unreachable.forEach((id, index) => {
    positions[id] = { x: index * COLUMN_WIDTH, y: orphanRowY }
  })

  return positions
}
