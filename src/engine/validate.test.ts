import { describe, expect, it } from 'vitest'
import { addChoice, addNode, addVariable, createStory, setChoiceCondition, setChoiceEffects, updateNode } from './storyOps'
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

  it('warns about a declared variable that is never used in any condition or effect', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    const { story: withVar, variableId } = addVariable(story, 'Unused')
    story = withVar

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `unused-variable-${variableId}`)).toBe(true)
  })

  it('does not warn about a variable referenced only in an effect', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    story = addChoice(story, startId, 'Take it')
    const choiceId = story.nodes[startId].choices[0].id
    const { story: withVar, variableId } = addVariable(story, 'Has Item')
    story = withVar
    story = setChoiceEffects(story, startId, choiceId, [{ variableId, op: 'set', value: 1 }])

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `unused-variable-${variableId}`)).toBe(false)
  })

  it('warns about a variable read in a condition but never changed by any effect', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    story = addChoice(story, startId, 'Use a key')
    const choiceId = story.nodes[startId].choices[0].id
    const { story: withVar, variableId } = addVariable(story, 'Has Key')
    story = withVar
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `static-variable-${variableId}`)).toBe(true)
    expect(issues.some((i) => i.id === `unused-variable-${variableId}`)).toBe(false)
  })

  it('does not warn about a static branch when a variable is both read and written', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'The beginning.' })
    story = addChoice(story, startId, 'Take it')
    story = addChoice(story, startId, 'Use it')
    const [takeChoiceId, useChoiceId] = story.nodes[startId].choices.map((c) => c.id)
    const { story: withVar, variableId } = addVariable(story, 'Has Key')
    story = withVar
    story = setChoiceEffects(story, startId, takeChoiceId, [{ variableId, op: 'set', value: 1 }])
    story = setChoiceCondition(story, startId, useChoiceId, { variableId, comparator: 'gte', value: 1 })

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `static-variable-${variableId}`)).toBe(false)
    expect(issues.some((i) => i.id === `unused-variable-${variableId}`)).toBe(false)
  })

  it('warns about two variables sharing the same name, case-insensitively', () => {
    let story = createStory()
    const { story: s1, variableId: firstId } = addVariable(story, 'Key')
    story = s1
    const { story: s2, variableId: secondId } = addVariable(story, 'key')
    story = s2

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `duplicate-variable-name-${firstId}`)).toBe(true)
    expect(issues.some((i) => i.id === `duplicate-variable-name-${secondId}`)).toBe(true)
  })

  it('does not warn about duplicate names when all variable names are unique', () => {
    let story = createStory()
    const { story: s1, variableId } = addVariable(story, 'Key')
    story = s1
    story = addVariable(story, 'Trust').story

    const issues = validateStory(story)
    expect(issues.some((i) => i.id === `duplicate-variable-name-${variableId}`)).toBe(false)
  })
})
