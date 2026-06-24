import { describe, expect, it } from 'vitest'
import {
  addChoice,
  addNode,
  addVariable,
  createStory,
  linkChoice,
  setChoiceCondition,
  setChoiceEffects,
  updateNode,
} from './storyOps'
import { buildPlainTextScript } from './exportText'

describe('buildPlainTextScript', () => {
  it('includes the story title and description', () => {
    const story = createStory('My Story', 'A thrilling tale.')
    const text = buildPlainTextScript(story)
    expect(text).toContain('My Story')
    expect(text).toContain('A thrilling tale.')
  })

  it('marks the start scene and lists a scene with no choices as an ending', () => {
    const story = createStory('Test')
    const startId = story.startNodeId!
    const text = buildPlainTextScript(story)
    expect(text).toContain(`=== ${story.nodes[startId].title} (старт) ===`)
    expect(text).toContain('(конец истории)')
  })

  it('lists a linked choice with its target scene title', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: withNode, nodeId: secondId } = addNode(story, { x: 0, y: 0 })
    story = updateNode(withNode, secondId, { title: 'Вторая сцена' })
    story = addChoice(story, startId, 'Go on')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, secondId)

    const text = buildPlainTextScript(story)
    expect(text).toContain('Go on → Вторая сцена')
  })

  it('shows "(без цели)" for a choice with no target', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Dangling')

    const text = buildPlainTextScript(story)
    expect(text).toContain('Dangling → (без цели)')
  })

  it('includes condition and effect details using variable names', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Trust', 0)
    story = withVar
    story = addChoice(story, startId, 'Use trust')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, startId)
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 2 })
    story = setChoiceEffects(story, startId, choiceId, [{ variableId, op: 'add', value: 1 }])

    const text = buildPlainTextScript(story)
    expect(text).toContain('Условие: Trust ≥ 2')
    expect(text).toContain('Эффект: Trust += 1')
  })

  it('excludes private author notes', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { notes: 'Secret plan only the author should see' })

    const text = buildPlainTextScript(story)
    expect(text).not.toContain('Secret plan only the author should see')
  })

  it('orders scenes by BFS distance from start, placing unreachable scenes after', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Начало' })
    const { story: withA, nodeId: aId } = addNode(story, { x: 0, y: 0 })
    story = updateNode(withA, aId, { title: 'А' })
    const { story: withB, nodeId: bId } = addNode(story, { x: 0, y: 0 })
    story = updateNode(withB, bId, { title: 'Б недостижима' })
    story = addChoice(story, startId, 'Go to A')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, aId)

    const text = buildPlainTextScript(story)
    const startIndex = text.indexOf('=== Начало')
    const aIndex = text.indexOf('=== А')
    const bIndex = text.indexOf('=== Б недостижима')
    expect(startIndex).toBeLessThan(aIndex)
    expect(aIndex).toBeLessThan(bIndex)
  })
})
