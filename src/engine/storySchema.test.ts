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
