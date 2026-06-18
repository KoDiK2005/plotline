import { describe, expect, it } from 'vitest'
import { addChoice, addNode, createStory, setChoiceCondition, setChoiceEffects, updateNode } from './storyOps'
import { hasBlockingErrors, validateStory } from './validate'

describe('validateStory', () => {
  it('flags a story with no scenes', () => {
    const story = createStory()
    const empty = { ...story, nodes: {}, startNodeId: null }
    const issues = validateStory(empty)
    expect(issues.some((i) => i.id === 'no-nodes')).toBe(true)
    expect(hasBlockingErrors(issues)).toBe(true)
  })

  it('flags a missing start node', () => {
    const story = createStory()
    const broken = { ...story, startNodeId: null }
    const issues = validateStory(broken)
    expect(issues.some((i) => i.id === 'no-start')).toBe(true)
  })

  it('warns about unreachable scenes, empty text and dangling choices', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'Something happens.' })
    story = addChoice(story, startId, 'A choice leading nowhere')
    const { story: withOrphan, nodeId: orphanId } = addNode(story)
    story = withOrphan

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `unreachable-${orphanId}`)).toBe(true)
    expect(issues.some((i) => i.id === `empty-text-${orphanId}`)).toBe(true)
    expect(issues.some((i) => i.id.startsWith('dangling-'))).toBe(true)
    expect(hasBlockingErrors(issues)).toBe(false)
  })

  it('is clean for a fully connected, fully written story', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    const issues = validateStory(story)
    expect(issues).toHaveLength(0)
  })

  it('warns about a condition or effect referencing a missing variable', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    story = addChoice(story, startId, 'Use a key')
    const choiceId = story.nodes[startId].choices[0].id
    story = setChoiceCondition(story, startId, choiceId, { variableId: 'missing-var', comparator: 'gte', value: 1 })
    story = setChoiceEffects(story, startId, choiceId, [{ variableId: 'missing-var', op: 'add', value: 1 }])

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `bad-condition-${choiceId}`)).toBe(true)
    expect(issues.some((i) => i.id === `bad-effect-${choiceId}-0`)).toBe(true)
  })
})
