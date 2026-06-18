import type { Choice, Story } from '../types/story'

export interface PlayState {
  currentNodeId: string
  history: string[]
  variables: Record<string, number>
}

export function startPlay(story: Story): PlayState | null {
  if (!story.startNodeId || !story.nodes[story.startNodeId]) return null
  const variables: Record<string, number> = {}
  for (const variable of story.variables) variables[variable.id] = variable.initialValue
  return { currentNodeId: story.startNodeId, history: [story.startNodeId], variables }
}

function meetsCondition(choice: Choice, variables: Record<string, number>): boolean {
  const condition = choice.condition
  if (!condition) return true
  const actual = variables[condition.variableId] ?? 0
  switch (condition.comparator) {
    case 'eq':
      return actual === condition.value
    case 'neq':
      return actual !== condition.value
    case 'gt':
      return actual > condition.value
    case 'gte':
      return actual >= condition.value
    case 'lt':
      return actual < condition.value
    case 'lte':
      return actual <= condition.value
  }
}

export function availableChoices(story: Story, state: PlayState): Choice[] {
  const node = story.nodes[state.currentNodeId]
  if (!node) return []
  return node.choices.filter(
    (c) => c.targetNodeId !== null && c.targetNodeId in story.nodes && meetsCondition(c, state.variables),
  )
}

export function isEnding(story: Story, state: PlayState): boolean {
  return availableChoices(story, state).length === 0
}

function applyEffects(choice: Choice, variables: Record<string, number>): Record<string, number> {
  if (choice.effects.length === 0) return variables
  const next = { ...variables }
  for (const effect of choice.effects) {
    const current = next[effect.variableId] ?? 0
    next[effect.variableId] = effect.op === 'set' ? effect.value : current + effect.value
  }
  return next
}

export function choose(story: Story, state: PlayState, choiceId: string): PlayState {
  const choice = availableChoices(story, state).find((c) => c.id === choiceId)
  if (!choice || !choice.targetNodeId) return state
  return {
    currentNodeId: choice.targetNodeId,
    history: [...state.history, choice.targetNodeId],
    variables: applyEffects(choice, state.variables),
  }
}
