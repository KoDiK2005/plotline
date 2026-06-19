import type { Choice, ChoiceCondition, ChoiceEffect, Story, StoryNode, StoryVariable } from '../types/story'

const COMPARATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte'])

function isChoiceCondition(value: unknown): value is ChoiceCondition {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return typeof c.variableId === 'string' && typeof c.comparator === 'string' && COMPARATORS.has(c.comparator) && typeof c.value === 'number'
}

function isChoiceEffect(value: unknown): value is ChoiceEffect {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.variableId === 'string' && (e.op === 'set' || e.op === 'add') && typeof e.value === 'number'
  )
}

/** Parses a choice, defaulting condition/effects for files saved before that feature existed. */
function parseChoice(value: unknown): Choice | null {
  if (typeof value !== 'object' || value === null) return null
  const c = value as Record<string, unknown>
  if (typeof c.id !== 'string' || typeof c.text !== 'string' || !(c.targetNodeId === null || typeof c.targetNodeId === 'string')) {
    return null
  }
  if (c.condition !== undefined && c.condition !== null && !isChoiceCondition(c.condition)) return null
  if (c.effects !== undefined && !(Array.isArray(c.effects) && c.effects.every(isChoiceEffect))) return null

  return {
    id: c.id,
    text: c.text,
    targetNodeId: c.targetNodeId as string | null,
    condition: (c.condition as ChoiceCondition | null | undefined) ?? null,
    effects: (c.effects as ChoiceEffect[] | undefined) ?? [],
  }
}

function isStoryVariable(value: unknown): value is StoryVariable {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.initialValue !== 'number') return false
  return v.type === undefined || v.type === 'number' || v.type === 'boolean'
}

function parseStoryNode(value: unknown): StoryNode | null {
  if (typeof value !== 'object' || value === null) return null
  const n = value as Record<string, unknown>
  if (
    typeof n.id !== 'string' ||
    typeof n.title !== 'string' ||
    typeof n.text !== 'string' ||
    !Array.isArray(n.choices) ||
    typeof n.position !== 'object' ||
    n.position === null ||
    typeof (n.position as Record<string, unknown>).x !== 'number' ||
    typeof (n.position as Record<string, unknown>).y !== 'number'
  ) {
    return null
  }

  const choices = n.choices.map(parseChoice)
  if (choices.some((c) => c === null)) return null

  return {
    id: n.id,
    title: n.title,
    text: n.text,
    choices: choices as Choice[],
    position: n.position as { x: number; y: number },
  }
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

  if (s.variables !== undefined && !(Array.isArray(s.variables) && s.variables.every(isStoryVariable))) {
    return null
  }

  const rawNodes = s.nodes as Record<string, unknown>
  const nodes: Record<string, StoryNode> = {}
  for (const [id, rawNode] of Object.entries(rawNodes)) {
    const node = parseStoryNode(rawNode)
    if (!node) return null
    nodes[id] = node
  }

  return {
    id: s.id,
    title: s.title,
    description: s.description,
    startNodeId: s.startNodeId as string | null,
    nodes,
    variables: (s.variables as StoryVariable[] | undefined) ?? [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}
