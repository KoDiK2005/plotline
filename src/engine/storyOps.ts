import type { Choice, ChoiceCondition, ChoiceEffect, Story, StoryNode, StoryVariable, VariableType } from '../types/story'
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
    notes: '',
  }
}

export function createStory(title = 'Новая история', description = '', author = '', writerId = ''): Story {
  const startNode = createEmptyNode({ x: 0, y: 0 }, 'Начало')
  const now = Date.now()
  return {
    id: generateId('story'),
    title,
    description,
    author,
    writerId,
    startNodeId: startNode.id,
    nodes: { [startNode.id]: startNode },
    variables: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function updateMeta(story: Story, patch: Partial<Pick<Story, 'title' | 'description' | 'author'>>): Story {
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
  patch: Partial<Pick<StoryNode, 'title' | 'text' | 'notes' | 'color'>>,
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
    if (!node.choices.some((choice) => choice.targetNodeId === nodeId)) {
      nodes[id] = node
      continue
    }
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

export function duplicateNode(story: Story, nodeId: string): { story: Story; nodeId: string | null } {
  const node = story.nodes[nodeId]
  if (!node) return { story, nodeId: null }
  const newNode: StoryNode = {
    id: generateId('node'),
    title: `${node.title} (копия)`,
    text: node.text,
    choices: node.choices.map((choice) => ({ ...choice, id: generateId('choice') })),
    position: { x: node.position.x + 40, y: node.position.y + 40 },
    notes: node.notes,
  }
  const nodes = { ...story.nodes, [newNode.id]: newNode }
  return { story: touch({ ...story, nodes }), nodeId: newNode.id }
}

export function addChoice(story: Story, nodeId: string, text = 'Новый вариант'): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choice: Choice = { id: generateId('choice'), text, targetNodeId: null, condition: null, effects: [] }
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

export function deleteDanglingChoices(story: Story): Story {
  let changed = false
  const nodes: Record<string, StoryNode> = {}
  for (const [id, node] of Object.entries(story.nodes)) {
    const choices = node.choices.filter((c) => c.targetNodeId !== null)
    if (choices.length === node.choices.length) {
      nodes[id] = node
      continue
    }
    changed = true
    nodes[id] = { ...node, choices }
  }
  if (!changed) return story
  return touch({ ...story, nodes })
}

export function moveChoice(story: Story, nodeId: string, choiceId: string, direction: 'up' | 'down'): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const index = node.choices.findIndex((c) => c.id === choiceId)
  if (index === -1) return story
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= node.choices.length) return story
  const choices = [...node.choices]
  ;[choices[index], choices[targetIndex]] = [choices[targetIndex], choices[index]]
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function setChoiceCondition(
  story: Story,
  nodeId: string,
  choiceId: string,
  condition: ChoiceCondition | null,
): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choices = node.choices.map((c) => (c.id === choiceId ? { ...c, condition } : c))
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function setChoiceEffects(
  story: Story,
  nodeId: string,
  choiceId: string,
  effects: ChoiceEffect[],
): Story {
  const node = story.nodes[nodeId]
  if (!node) return story
  const choices = node.choices.map((c) => (c.id === choiceId ? { ...c, effects } : c))
  const nodes = { ...story.nodes, [nodeId]: { ...node, choices } }
  return touch({ ...story, nodes })
}

export function addVariable(
  story: Story,
  name = 'Переменная',
  initialValue = 0,
  type: VariableType = 'number',
): { story: Story; variableId: string } {
  const variable: StoryVariable = { id: generateId('var'), name, initialValue, type }
  return { story: touch({ ...story, variables: [...story.variables, variable] }), variableId: variable.id }
}

export function updateVariable(
  story: Story,
  variableId: string,
  patch: Partial<Pick<StoryVariable, 'name' | 'initialValue' | 'type'>>,
): Story {
  if (!story.variables.some((v) => v.id === variableId)) return story
  const variables = story.variables.map((v) => (v.id === variableId ? { ...v, ...patch } : v))
  return touch({ ...story, variables })
}

export function deleteVariable(story: Story, variableId: string): Story {
  if (!story.variables.some((v) => v.id === variableId)) return story
  const variables = story.variables.filter((v) => v.id !== variableId)
  const nodes: Record<string, StoryNode> = {}
  for (const [id, node] of Object.entries(story.nodes)) {
    const usesVariable = node.choices.some(
      (choice) =>
        choice.condition?.variableId === variableId ||
        choice.effects.some((effect) => effect.variableId === variableId),
    )
    if (!usesVariable) {
      nodes[id] = node
      continue
    }
    nodes[id] = {
      ...node,
      choices: node.choices.map((choice) => ({
        ...choice,
        condition: choice.condition?.variableId === variableId ? null : choice.condition,
        effects: choice.effects.filter((effect) => effect.variableId !== variableId),
      })),
    }
  }
  return touch({ ...story, nodes, variables })
}

export function countVariableUsages(story: Story, variableId: string): number {
  let count = 0
  for (const node of Object.values(story.nodes)) {
    for (const choice of node.choices) {
      if (choice.condition?.variableId === variableId) count++
      count += choice.effects.filter((effect) => effect.variableId === variableId).length
    }
  }
  return count
}

export function applyPositions(story: Story, positions: Record<string, { x: number; y: number }>): Story {
  let changed = false
  const nodes = { ...story.nodes }
  for (const [id, position] of Object.entries(positions)) {
    const node = nodes[id]
    if (!node) continue
    if (node.position.x === position.x && node.position.y === position.y) continue
    changed = true
    nodes[id] = { ...node, position }
  }
  if (!changed) return story
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
