import { describe, expect, it } from 'vitest'
import { createStory } from './storyOps'
import { parseLibraryBackup, parseStoryJson } from './storySchema'

describe('parseStoryJson', () => {
  it('accepts a well-formed story round-tripped through JSON', () => {
    const story = createStory('Test')
    const parsed = parseStoryJson(JSON.parse(JSON.stringify(story)))
    expect(parsed).toEqual(story)
  })

  it('rejects non-object input', () => {
    expect(parseStoryJson(null)).toBeNull()
    expect(parseStoryJson('hello')).toBeNull()
    expect(parseStoryJson(42)).toBeNull()
  })

  it('rejects an object missing required fields', () => {
    expect(parseStoryJson({ title: 'No id or nodes' })).toBeNull()
  })

  it('rejects a story with a malformed node', () => {
    const story = createStory('Test')
    const nodeId = Object.keys(story.nodes)[0]
    const broken = {
      ...story,
      nodes: { ...story.nodes, [nodeId]: { ...story.nodes[nodeId], choices: 'not-an-array' } },
    }
    expect(parseStoryJson(broken)).toBeNull()
  })

  it('rejects a node with a malformed choice', () => {
    const story = createStory('Test')
    const nodeId = Object.keys(story.nodes)[0]
    const broken = {
      ...story,
      nodes: {
        ...story.nodes,
        [nodeId]: { ...story.nodes[nodeId], choices: [{ id: 'c1', text: 'x', targetNodeId: 5 }] },
      },
    }
    expect(parseStoryJson(broken)).toBeNull()
  })

  it('accepts a story saved before variables/conditions/effects existed', () => {
    const story = createStory('Legacy')
    const nodeId = Object.keys(story.nodes)[0]
    const { variables, ...storyWithoutVariables } = story
    const legacy = {
      ...storyWithoutVariables,
      nodes: {
        [nodeId]: {
          ...story.nodes[nodeId],
          choices: [{ id: 'c1', text: 'Go', targetNodeId: null }],
        },
      },
    }
    void variables
    const parsed = parseStoryJson(legacy)
    expect(parsed).not.toBeNull()
    expect(parsed!.variables).toEqual([])
    expect(parsed!.nodes[nodeId].choices[0].condition).toBeNull()
    expect(parsed!.nodes[nodeId].choices[0].effects).toEqual([])
  })

  it('rejects a choice with a malformed condition', () => {
    const story = createStory('Test')
    const nodeId = Object.keys(story.nodes)[0]
    const broken = {
      ...story,
      nodes: {
        ...story.nodes,
        [nodeId]: {
          ...story.nodes[nodeId],
          choices: [{ id: 'c1', text: 'x', targetNodeId: null, condition: { variableId: 'v1', comparator: 'huh', value: 1 } }],
        },
      },
    }
    expect(parseStoryJson(broken)).toBeNull()
  })

  it('accepts a variable with an explicit type and one saved before the type field existed', () => {
    const story = createStory('Test')
    const withTypedVariable = {
      ...story,
      variables: [{ id: 'v1', name: 'Has Key', initialValue: 0, type: 'boolean' }],
    }
    const parsed = parseStoryJson(withTypedVariable)
    expect(parsed!.variables[0].type).toBe('boolean')

    const legacyVariable = { ...story, variables: [{ id: 'v1', name: 'Score', initialValue: 0 }] }
    const parsedLegacy = parseStoryJson(legacyVariable)
    expect(parsedLegacy!.variables[0].type).toBeUndefined()
  })

  it('rejects a variable with an invalid type', () => {
    const story = createStory('Test')
    const broken = { ...story, variables: [{ id: 'v1', name: 'Score', initialValue: 0, type: 'string' }] }
    expect(parseStoryJson(broken)).toBeNull()
  })

  it('defaults notes to an empty string for a node saved before that field existed', () => {
    const story = createStory('Legacy notes')
    const nodeId = Object.keys(story.nodes)[0]
    const { notes, ...nodeWithoutNotes } = story.nodes[nodeId]
    void notes
    const legacy = { ...story, nodes: { [nodeId]: nodeWithoutNotes } }
    const parsed = parseStoryJson(legacy)
    expect(parsed!.nodes[nodeId].notes).toBe('')
  })

  it('rejects a node with non-string notes', () => {
    const story = createStory('Test')
    const nodeId = Object.keys(story.nodes)[0]
    const broken = { ...story, nodes: { ...story.nodes, [nodeId]: { ...story.nodes[nodeId], notes: 42 } } }
    expect(parseStoryJson(broken)).toBeNull()
  })
})

describe('parseLibraryBackup', () => {
  it('accepts a backup with multiple stories', () => {
    const stories = [createStory('A'), createStory('B')]
    const parsed = parseLibraryBackup(JSON.parse(JSON.stringify({ stories })))
    expect(parsed).toEqual(stories)
  })

  it('rejects a backup missing the stories array', () => {
    expect(parseLibraryBackup({})).toBeNull()
    expect(parseLibraryBackup({ stories: 'nope' })).toBeNull()
  })

  it('rejects a backup containing one malformed story', () => {
    const stories = [createStory('A'), { title: 'broken' }]
    expect(parseLibraryBackup({ stories })).toBeNull()
  })
})
