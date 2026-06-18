import { describe, expect, it } from 'vitest'
import { addChoice, addNode, createStory, linkChoice } from './storyOps'
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
    expect(state).toEqual({ currentNodeId: startId, history: [startId] })
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
    const state = { currentNodeId: goodEndId, history: [goodEndId] }
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
