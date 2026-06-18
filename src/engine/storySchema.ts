import type { Choice, Story, StoryNode } from '../types/story'

function isChoice(value: unknown): value is Choice {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.text === 'string' &&
    (c.targetNodeId === null || typeof c.targetNodeId === 'string')
  )
}

function isStoryNode(value: unknown): value is StoryNode {
  if (typeof value !== 'object' || value === null) return false
  const n = value as Record<string, unknown>
  return (
    typeof n.id === 'string' &&
    typeof n.title === 'string' &&
    typeof n.text === 'string' &&
    Array.isArray(n.choices) &&
    n.choices.every(isChoice) &&
    typeof n.position === 'object' &&
    n.position !== null &&
    typeof (n.position as Record<string, unknown>).x === 'number' &&
    typeof (n.position as Record<string, unknown>).y === 'number'
  )
}

/** Runtime guard for a full-library backup file ({ stories: Story[] }). */
export function parseLibraryBackup(data: unknown): Story[] | null {
  if (typeof data !== 'object' || data === null) return null
  const stories = (data as Record<string, unknown>).stories
  if (!Array.isArray(stories)) return null
  const parsed = stories.map(parseStoryJson)
  if (parsed.some((s) => s === null)) return null
  return parsed as Story[]
}

/** Runtime guard for story JSON loaded from an imported file. Returns null for anything malformed. */
export function parseStoryJson(data: unknown): Story | null {
  if (typeof data !== 'object' || data === null) return null
  const s = data as Record<string, unknown>
  if (
    typeof s.id !== 'string' ||
    typeof s.title !== 'string' ||
    typeof s.description !== 'string' ||
    !(s.startNodeId === null || typeof s.startNodeId === 'string') ||
    typeof s.nodes !== 'object' ||
    s.nodes === null ||
    typeof s.createdAt !== 'number' ||
    typeof s.updatedAt !== 'number'
  ) {
    return null
  }

  const nodes = s.nodes as Record<string, unknown>
  for (const node of Object.values(nodes)) {
    if (!isStoryNode(node)) return null
  }

  return s as unknown as Story
}
