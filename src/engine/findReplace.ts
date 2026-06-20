import type { Story, StoryNode } from '../types/story'

export type MatchField = 'title' | 'text' | 'choice'

export interface SearchMatch {
  nodeId: string
  field: MatchField
  choiceId?: string
  snippet: string
}

export interface FindOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// \b is ASCII-only (based on \w), so it silently fails to bound Cyrillic
// words. Unicode property lookarounds work for any script.
function buildRegex(query: string, options: FindOptions, flags: string): RegExp {
  const escaped = escapeRegExp(query)
  const pattern = options.wholeWord ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])` : escaped
  const caseFlag = options.caseSensitive ? '' : 'i'
  const unicodeFlag = options.wholeWord ? 'u' : ''
  return new RegExp(pattern, flags + caseFlag + unicodeFlag)
}

export function findMatches(story: Story, query: string, options: FindOptions = {}): SearchMatch[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const regex = buildRegex(trimmed, options, '')
  const matches: SearchMatch[] = []

  for (const node of Object.values(story.nodes)) {
    if (regex.test(node.title)) {
      matches.push({ nodeId: node.id, field: 'title', snippet: node.title })
    }
    if (regex.test(node.text)) {
      matches.push({ nodeId: node.id, field: 'text', snippet: node.text })
    }
    for (const choice of node.choices) {
      if (regex.test(choice.text)) {
        matches.push({ nodeId: node.id, field: 'choice', choiceId: choice.id, snippet: choice.text })
      }
    }
  }

  return matches
}

function replaceInText(text: string, query: string, replacement: string, options: FindOptions): string {
  const regex = buildRegex(query, options, 'g')
  return text.replace(regex, replacement)
}

export function replaceAll(story: Story, query: string, replacement: string, options: FindOptions = {}): Story {
  const trimmed = query.trim()
  if (!trimmed) return story

  const nodes: Record<string, StoryNode> = {}
  for (const [id, node] of Object.entries(story.nodes)) {
    nodes[id] = {
      ...node,
      title: replaceInText(node.title, trimmed, replacement, options),
      text: replaceInText(node.text, trimmed, replacement, options),
      choices: node.choices.map((choice) => ({
        ...choice,
        text: replaceInText(choice.text, trimmed, replacement, options),
      })),
    }
  }

  return { ...story, nodes, updatedAt: Date.now() }
}
