import type { Story, StoryNode } from '../types/story'

export type MatchField = 'title' | 'text' | 'choice'

export interface SearchMatch {
  nodeId: string
  field: MatchField
  choiceId?: string
  snippet: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findMatches(story: Story, query: string): SearchMatch[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const lower = trimmed.toLowerCase()
  const matches: SearchMatch[] = []

  for (const node of Object.values(story.nodes)) {
    if (node.title.toLowerCase().includes(lower)) {
      matches.push({ nodeId: node.id, field: 'title', snippet: node.title })
    }
    if (node.text.toLowerCase().includes(lower)) {
      matches.push({ nodeId: node.id, field: 'text', snippet: node.text })
    }
    for (const choice of node.choices) {
      if (choice.text.toLowerCase().includes(lower)) {
        matches.push({ nodeId: node.id, field: 'choice', choiceId: choice.id, snippet: choice.text })
      }
    }
  }

  return matches
}

function replaceInText(text: string, query: string, replacement: string): string {
  const regex = new RegExp(escapeRegExp(query), 'gi')
  return text.replace(regex, replacement)
}

export function replaceAll(story: Story, query: string, replacement: string): Story {
  const trimmed = query.trim()
  if (!trimmed) return story

  const nodes: Record<string, StoryNode> = {}
  for (const [id, node] of Object.entries(story.nodes)) {
    nodes[id] = {
      ...node,
      title: replaceInText(node.title, trimmed, replacement),
      text: replaceInText(node.text, trimmed, replacement),
      choices: node.choices.map((choice) => ({ ...choice, text: replaceInText(choice.text, trimmed, replacement) })),
    }
  }

  return { ...story, nodes, updatedAt: Date.now() }
}
