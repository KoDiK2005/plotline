import { describe, expect, it } from 'vitest'
import {
  addChoice,
  addNode,
  addVariable,
  createStory,
  deleteChoice,
  deleteNode,
  deleteVariable,
  linkChoice,
  setChoiceCondition,
  setChoiceEffects,
  setStartNode,
  updateChoiceText,
  updateNode,
  updateVariable,
} from './storyOps'

describe('createStory', () => {
  it('creates a story with a single start node', () => {
    const story = createStory('My Story')
    expect(story.title).toBe('My Story')
    expect(Object.keys(story.nodes)).toHaveLength(1)
    expect(story.startNodeId).toBe(Object.keys(story.nodes)[0])
  })
})

describe('addNode / updateNode', () => {
  it('adds a node and allows editing its title and text', () => {
    let story = createStory()
    const { story: withNode, nodeId } = addNode(story, { x: 100, y: 50 })
    story = withNode
    expect(story.nodes[nodeId].position).toEqual({ x: 100, y: 50 })

    story = updateNode(story, nodeId, { title: 'Forest', text: 'Dark trees.' })
    expect(story.nodes[nodeId].title).toBe('Forest')
    expect(story.nodes[nodeId].text).toBe('Dark trees.')
  })

  it('is a no-op when the node does not exist', () => {
    const story = createStory()
    const result = updateNode(story, 'missing', { title: 'x' })
    expect(result).toBe(story)
  })
})

describe('choices', () => {
  it('adds, links, renames and deletes a choice', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond

    story = addChoice(story, startId, 'Go north')
    const choiceId = story.nodes[startId].choices[0].id
    expect(story.nodes[startId].choices[0].targetNodeId).toBeNull()

    story = linkChoice(story, startId, choiceId, secondId)
    expect(story.nodes[startId].choices[0].targetNodeId).toBe(secondId)

    story = updateChoiceText(story, startId, choiceId, 'Go further north')
    expect(story.nodes[startId].choices[0].text).toBe('Go further north')

    story = deleteChoice(story, startId, choiceId)
    expect(story.nodes[startId].choices).toHaveLength(0)
  })

  it('refuses to link a choice to a node that does not exist', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Go nowhere')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, 'does-not-exist')
    expect(story.nodes[startId].choices[0].targetNodeId).toBeNull()
  })
})

describe('deleteNode', () => {
  it('unlinks choices that pointed at the deleted node', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond
    story = addChoice(story, startId, 'Go to second')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, secondId)

    story = deleteNode(story, secondId)
    expect(story.nodes[secondId]).toBeUndefined()
    expect(story.nodes[startId].choices[0].targetNodeId).toBeNull()
  })

  it('reassigns the start node when the start node is deleted', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond

    story = deleteNode(story, startId)
    expect(story.startNodeId).toBe(secondId)
  })

  it('sets startNodeId to null when the last node is deleted', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = deleteNode(story, startId)
    expect(story.startNodeId).toBeNull()
    expect(Object.keys(story.nodes)).toHaveLength(0)
  })
})

describe('setStartNode', () => {
  it('only accepts an existing node id', () => {
    let story = createStory()
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond
    story = setStartNode(story, secondId)
    expect(story.startNodeId).toBe(secondId)

    const unchanged = setStartNode(story, 'missing')
    expect(unchanged.startNodeId).toBe(secondId)
  })
})

describe('variables', () => {
  it('adds, renames and deletes a variable', () => {
    let story = createStory()
    const { story: withVar, variableId } = addVariable(story, 'Trust', 0)
    story = withVar
    expect(story.variables).toHaveLength(1)

    story = updateVariable(story, variableId, { initialValue: 2 })
    expect(story.variables[0].initialValue).toBe(2)

    story = deleteVariable(story, variableId)
    expect(story.variables).toHaveLength(0)
  })

  it('clears choice conditions and effects that reference a deleted variable', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Key', 0)
    story = withVar
    story = addChoice(story, startId, 'Use key')
    const choiceId = story.nodes[startId].choices[0].id
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })
    story = setChoiceEffects(story, startId, choiceId, [{ variableId, op: 'set', value: 1 }])

    story = deleteVariable(story, variableId)
    expect(story.nodes[startId].choices[0].condition).toBeNull()
    expect(story.nodes[startId].choices[0].effects).toEqual([])
  })
})

describe('setChoiceCondition / setChoiceEffects', () => {
  it('sets and clears a choice condition', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Trust', 0)
    story = withVar
    story = addChoice(story, startId, 'Ask for help')
    const choiceId = story.nodes[startId].choices[0].id

    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'eq', value: 1 })
    expect(story.nodes[startId].choices[0].condition).toEqual({ variableId, comparator: 'eq', value: 1 })

    story = setChoiceCondition(story, startId, choiceId, null)
    expect(story.nodes[startId].choices[0].condition).toBeNull()
  })

  it('replaces the effects list for a choice', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Trust', 0)
    story = withVar
    story = addChoice(story, startId, 'Help out')
    const choiceId = story.nodes[startId].choices[0].id

    story = setChoiceEffects(story, startId, choiceId, [{ variableId, op: 'add', value: 1 }])
    expect(story.nodes[startId].choices[0].effects).toEqual([{ variableId, op: 'add', value: 1 }])

    story = setChoiceEffects(story, startId, choiceId, [])
    expect(story.nodes[startId].choices[0].effects).toEqual([])
  })
})
