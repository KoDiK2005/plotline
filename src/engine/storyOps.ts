import type { Choice, Story, StoryNode } from '../types/story'
import { generateId } from './id'

function touch(story: Story): Story {
  return { ...story, updatedAt: Date.now() }
}

export function createEmptyNode(position: { x: number; y: number }, title = 'Новая сцена'): StoryNode {
  return {
    id: generateId('node'),
    title,
    text: '',
    choices: [],
    position,
  }
}

export function createStory(title = 'Новая история', description = ''): Story {
  const startNode = createEmptyNode({ x: 0, y: 0 }, 'Начало')
  const now = Date.now()
  return {
    id: generateId('story'),
    title,
    description,
    startNodeId: startNode.id,
    nodes: { [startNode.id]: startNode },
    createdAt: now,
    updatedAt: now,
  }
}

export function updateMeta(story: Story, patch: Partial<Pick<Story, 'title' | 'description'>>): Story {
  return touch({ ...story, ...patch })
}

export function addNode(story: Story, position = { x: 0, y: 0 }): { story: Story; nodeId: string } {
  const node = createEmptyNode(position)
  const nodes = { ...story.nodes, [node.id]: node }
  return { story: touch({ ...story, nodes }), nodeId: node.id }
}

export function updateNode(
  story: Story,
  nodeId: string,
  patch: Partial<Pick<StoryNode, 'title' | 'text'>>,
): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const nodes = { ...story.nodes, [nodeId]: { ...node, ...patch } }
  return touch({ ...story, nodes })
}

export function moveNode(story: Story, nodeId: string, position: { x: number; y: number }): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const nodes = { ...story.nodes, [nodeId]: { ...node, position } }
  return { ...story, nodes }
}

export function deleteNode(story: Story, nodeId: string): Story {
  if (!story.nodes[nodeId]) return story
  const nodes: Record<string, StoryNode> = {}
  for (const [id, node] of Object.entries(story.nodes)) {
    if (id === nodeId) continue
    nodes[id] = {
      ...node,
      choices: node.choices.map((choice) =>
        choice.targetNodeId === nodeId ? { ...choice, targetNodeId: null } : choice,
      ),
    }
  }
  const remainingIds = Object.keys(nodes)
  const startNodeId =
    story.startNodeId === nodeId ? remainingIds[0] ?? null : story.startNodeId
  return touch({ ...story, nodes, startNodeId })
}

export function setStartNode(story: Story, nodeId: string): Story {
  if (!story.nodes[nodeId]) return story
  return touch({ ...story, startNodeId: nodeId })
}

export function addChoice(story: Story, nodeId: string, text = 'Новый вариант'): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choice: Choice = { id: generateId('choice'), text, targetNodeId: null }
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices: [...node.choices, choice] } }
  return touch({ ...story, nodes })
}

export function updateChoiceText(story: Story, nodeId: string, choiceId: string, text: string): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choices = node.choices.map((c) => (c.id === choiceId ? { ...c, text } : c))
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function linkChoice(
  story: Story,
  nodeId: string,
  choiceId: string,
  targetNodeId: string | null,
): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  if (targetNodeId !== null && !story.nodes[targetNodeId]) return story
  const choices = node.choices.map((c) => (c.id === choiceId ? { ...c, targetNodeId } : c))
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function deleteChoice(story: Story, nodeId: string, choiceId: string): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choices = node.choices.filter((c) => c.id !== choiceId)
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function applyPositions(story: Story, positions: Record<string, { x: number; y: number }>): Story {
  const nodes = { ...story.nodes }
  for (const [id, position] of Object.entries(positions)) {
    if (nodes[id]) nodes[id] = { ...nodes[id], position }
  }
  return touch({ ...story, nodes })
}

export function duplicateStory(story: Story, newTitle?: string): Story {
  const now = Date.now()
  return {
    ...story,
    id: generateId('story'),
    title: newTitle ?? `${story.title} (копия)`,
    createdAt: now,
    updatedAt: now,
  }
}
