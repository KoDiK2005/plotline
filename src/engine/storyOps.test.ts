import { describe, expect, it } from 'vitest'
import {
  addChoice,
  addNode,
  addVariable,
  countVariableUsages,
  createStory,
  deleteChoice,
  deleteDanglingChoices,
  deleteNode,
  deleteVariable,
  duplicateNode,
  linkChoice,
  moveChoice,
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

describe('deleteDanglingChoices', () => {
  it('removes only choices with no target across every node', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond

    story = addChoice(story, startId, 'Linked')
    story = addChoice(story, startId, 'Dangling 1')
    story = addChoice(story, secondId, 'Dangling 2')
    const linkedChoiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, linkedChoiceId, secondId)

    story = deleteDanglingChoices(story)

    expect(story.nodes[startId].choices).toHaveLength(1)
    expect(story.nodes[startId].choices[0].id).toBe(linkedChoiceId)
    expect(story.nodes[secondId].choices).toHaveLength(0)
  })

  it('is a no-op when there are no dangling choices', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond
    story = addChoice(story, startId, 'Linked')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, secondId)

    const result = deleteDanglingChoices(story)
    expect(result.nodes[startId].choices).toHaveLength(1)
  })

  it('returns the same story when nothing is dangling, and keeps unaffected node references stable otherwise', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond
    story = addChoice(story, startId, 'Linked')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, secondId)
    expect(deleteDanglingChoices(story)).toBe(story)

    story = addChoice(story, startId, 'Dangling')
    const untouched = story.nodes[secondId]
    const result = deleteDanglingChoices(story)
    expect(result.nodes[secondId]).toBe(untouched)
  })
})

describe('moveChoice', () => {
  it('swaps a choice with its neighbour when moved up or down', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'First')
    story = addChoice(story, startId, 'Second')
    story = addChoice(story, startId, 'Third')
    const [firstId, secondId, thirdId] = story.nodes[startId].choices.map((c) => c.id)

    story = moveChoice(story, startId, secondId, 'up')
    expect(story.nodes[startId].choices.map((c) => c.id)).toEqual([secondId, firstId, thirdId])

    story = moveChoice(story, startId, secondId, 'down')
    expect(story.nodes[startId].choices.map((c) => c.id)).toEqual([firstId, secondId, thirdId])
  })

  it('is a no-op at the boundaries', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'First')
    story = addChoice(story, startId, 'Second')
    const [firstId, secondId] = story.nodes[startId].choices.map((c) => c.id)

    const movedFirstUp = moveChoice(story, startId, firstId, 'up')
    expect(movedFirstUp).toBe(story)

    const movedSecondDown = moveChoice(story, startId, secondId, 'down')
    expect(movedSecondDown).toBe(story)
  })

  it('is a no-op for a missing node or choice', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Only')
    const choiceId = story.nodes[startId].choices[0].id

    expect(moveChoice(story, 'missing-node', choiceId, 'up')).toBe(story)
    expect(moveChoice(story, startId, 'missing-choice', 'up')).toBe(story)
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

  it('keeps the reference of nodes whose choices do not target the deleted node', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: s1, nodeId: secondId } = addNode(story)
    story = s1
    const { story: s2, nodeId: thirdId } = addNode(story)
    story = s2
    story = addChoice(story, startId, 'Go to second')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, secondId)

    const untouched = story.nodes[startId]
    story = deleteNode(story, thirdId)
    expect(story.nodes[startId]).toBe(untouched)
  })
})

describe('duplicateNode', () => {
  it('clones a node with a "(копия)" title, the same text, and fresh choice ids pointing at the same targets', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Лес', text: 'Тёмный лес.' })
    const { story: s1, nodeId: otherId } = addNode(story)
    story = s1
    story = addChoice(story, startId, 'Идти вперёд')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, otherId)

    const { story: s2, nodeId: copyId } = duplicateNode(story, startId)
    story = s2

    expect(copyId).not.toBeNull()
    expect(copyId).not.toBe(startId)
    const copy = story.nodes[copyId!]
    expect(copy.title).toBe('Лес (копия)')
    expect(copy.text).toBe('Тёмный лес.')
    expect(copy.choices).toHaveLength(1)
    expect(copy.choices[0].id).not.toBe(story.nodes[startId].choices[0].id)
    expect(copy.choices[0].targetNodeId).toBe(otherId)
    expect(copy.choices[0].text).toBe('Идти вперёд')
    // The original node is untouched.
    expect(story.nodes[startId].title).toBe('Лес')
  })

  it('offsets the duplicate position from the original', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = { ...story, nodes: { ...story.nodes, [startId]: { ...story.nodes[startId], position: { x: 10, y: 20 } } } }

    const { story: next, nodeId: copyId } = duplicateNode(story, startId)
    expect(next.nodes[copyId!].position).toEqual({ x: 50, y: 60 })
  })

  it('returns the story unchanged and a null id for a missing node', () => {
    const story = createStory()
    const result = duplicateNode(story, 'missing')
    expect(result.nodeId).toBeNull()
    expect(result.story).toBe(story)
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

  it('defaults a new variable to type "number" and accepts an explicit type', () => {
    let story = createStory()
    const { story: withDefault, variableId: defaultId } = addVariable(story, 'Score', 0)
    story = withDefault
    expect(story.variables.find((v) => v.id === defaultId)?.type).toBe('number')

    const { story: withBoolean, variableId: boolId } = addVariable(story, 'Has Key', 0, 'boolean')
    story = withBoolean
    expect(story.variables.find((v) => v.id === boolId)?.type).toBe('boolean')
  })

  it('changes a variable type via updateVariable', () => {
    let story = createStory()
    const { story: withVar, variableId } = addVariable(story, 'Has Key', 0, 'number')
    story = withVar
    story = updateVariable(story, variableId, { type: 'boolean' })
    expect(story.variables[0].type).toBe('boolean')
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

  it('keeps the reference of nodes whose choices do not reference the deleted variable', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Key', 0)
    story = withVar
    const { story: withSecond, nodeId: secondId } = addNode(story)
    story = withSecond
    story = addChoice(story, startId, 'Use key')
    const choiceId = story.nodes[startId].choices[0].id
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })

    const untouched = story.nodes[secondId]
    story = deleteVariable(story, variableId)
    expect(story.nodes[secondId]).toBe(untouched)
  })

  it('counts how many conditions and effects reference a variable', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Key', 0)
    story = withVar
    expect(countVariableUsages(story, variableId)).toBe(0)

    story = addChoice(story, startId, 'Use key')
    const choiceId = story.nodes[startId].choices[0].id
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })
    story = setChoiceEffects(story, startId, choiceId, [
      { variableId, op: 'set', value: 1 },
      { variableId, op: 'add', value: 1 },
    ])

    expect(countVariableUsages(story, variableId)).toBe(3)
  })

  it('returns 0 for a variable with no matching usages', () => {
    let story = createStory()
    const { story: withVar, variableId } = addVariable(story, 'Unused', 0)
    story = withVar
    expect(countVariableUsages(story, variableId)).toBe(0)
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
