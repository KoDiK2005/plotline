import type { Choice, Story } from '../types/story'

export interface PlayState {
  currentNodeId: string
  history: string[]
}

export function startPlay(story: Story): PlayState | null {
  if (!story.startNodeId || !story.nodes[story.startNodeId]) return null
  return { currentNodeId: story.startNodeId, history: [story.startNodeId] }
}

export function availableChoices(story: Story, state: PlayState): Choice[] {
  const node = story.nodes[state.currentNodeId]
  if (!node) return []
  return node.choices.filter((c) => c.targetNodeId !== null && c.targetNodeId in story.nodes)
}

export function isEnding(story: Story, state: PlayState): boolean {
  return availableChoices(story, state).length === 0
}

export function choose(story: Story, state: PlayState, choiceId: string): PlayState {
  const choice = availableChoices(story, state).find((c) => c.id === choiceId)
  if (!choice || !choice.targetNodeId) return state
  return {
    currentNodeId: choice.targetNodeId,
    history: [...state.history, choice.targetNodeId],
  }
}
