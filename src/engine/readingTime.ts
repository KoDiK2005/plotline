import type { Story } from '../types/story'
import { reachableNodeIds } from './traverse'

const WORDS_PER_MINUTE = 200

function countWords(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
}

/** Estimated minutes to read all reachable scene text, rounded up to at least 1. */
export function estimateReadingMinutes(story: Story): number {
  const reachable = reachableNodeIds(story)
  const totalWords = Object.values(story.nodes)
    .filter((node) => reachable.has(node.id))
    .reduce((sum, node) => sum + countWords(node.text), 0)
  return Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE))
}
