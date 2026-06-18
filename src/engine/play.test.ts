import { describe, expect, it } from 'vitest'
import { addChoice, addNode, addVariable, createStory, linkChoice, setChoiceCondition, setChoiceEffects } from './storyOps'
import { availableChoices, choose, isEnding, startPlay } from './play'

function branchingStory() {
  let story = createStory()
  const startId = story.startNodeId!
  const { story: s2, nodeId: goodEndId } = addNode(story)
  story = s2
  const { story: s3, nodeId: badEndId } = addNode(story)
  story = s3

  story = addChoice(story, startId, 'Be brave')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, goodEndId)
  story = addChoice(story, startId, 'Run away')
  story = linkChoice(story, startId, story.nodes[startId].choices[1].id, badEndId)

  return { story, startId, goodEndId, badEndId }
}

describe('startPlay', () => {
  it('starts at the start node with a one-entry history', () => {
    const { story, startId } = branchingStory()
    const state = startPlay(story)
    expect(state).toEqual({ currentNodeId: startId, history: [startId], variables: {} })
  })

  it('returns null when there is no valid start node', () => {
    const story = { ...createStory(), startNodeId: null }
    expect(startPlay(story)).toBeNull()
  })
})

describe('availableChoices / isEnding', () => {
  it('lists only choices with a valid target', () => {
    const { story, startId } = branchingStory()
    const state = startPlay(story)!
    expect(availableChoices(story, state)).toHaveLength(2)
    expect(isEnding(story, state)).toBe(false)
    expect(state.currentNodeId).toBe(startId)
  })

  it('treats a node with no linked choices as an ending', () => {
    const { story, goodEndId } = branchingStory()
    const state = { currentNodeId: goodEndId, history: [goodEndId], variables: {} }
    expect(isEnding(story, state)).toBe(true)
  })
})

describe('choose', () => {
  it('moves to the chosen target and appends to history', () => {
    const { story, startId, goodEndId } = branchingStory()
    const state = startPlay(story)!
    const choiceId = story.nodes[startId].choices[0].id
    const next = choose(story, state, choiceId)
    expect(next.currentNodeId).toBe(goodEndId)
    expect(next.history).toEqual([startId, goodEndId])
  })

  it('ignores an invalid choice id', () => {
    const { story } = branchingStory()
    const state = startPlay(story)!
    const next = choose(story, state, 'not-a-real-choice')
    expect(next).toBe(state)
  })
})

describe('variables and conditions', () => {
  it('initializes play state variables from the story defaults', () => {
    let story = createStory()
    const { story: withVar } = addVariable(story, 'Trust', 3)
    story = withVar
    const state = startPlay(story)!
    expect(Object.values(state.variables)).toEqual([3])
  })

  it('hides a choice whose condition is not met and reveals it once it is', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: s2, nodeId: targetId } = addNode(story)
    story = s2
    const { story: withVar, variableId } = addVariable(story, 'Key', 0)
    story = withVar
    story = addChoice(story, startId, 'Use the key')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, targetId)
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })

    const locked = startPlay(story)!
    expect(availableChoices(story, locked)).toHaveLength(0)

    const unlocked = { ...locked, variables: { [variableId]: 1 } }
    expect(availableChoices(story, unlocked)).toHaveLength(1)
  })

  it('applies a choice effect when chosen (set and add)', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: s2, nodeId: middleId } = addNode(story)
    story = s2
    const { story: s3, nodeId: endId } = addNode(story)
    story = s3
    const { story: withVar, variableId } = addVariable(story, 'Trust', 0)
    story = withVar

    story = addChoice(story, startId, 'Set trust to 1')
    const firstChoiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, firstChoiceId, middleId)
    story = setChoiceEffects(story, startId, firstChoiceId, [{ variableId, op: 'set', value: 1 }])

    story = addChoice(story, middleId, 'Add 2 to trust')
    const secondChoiceId = story.nodes[middleId].choices[0].id
    story = linkChoice(story, middleId, secondChoiceId, endId)
    story = setChoiceEffects(story, middleId, secondChoiceId, [{ variableId, op: 'add', value: 2 }])

    let state = startPlay(story)!
    state = choose(story, state, firstChoiceId)
    expect(state.variables[variableId]).toBe(1)
    state = choose(story, state, secondChoiceId)
    expect(state.variables[variableId]).toBe(3)
  })
})
