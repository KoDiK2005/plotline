import { describe, expect, it } from 'vitest'
import { addChoice, createStory, updateChoiceText, updateNode } from './storyOps'
import { findMatches, replaceAll } from './findReplace'

function sampleStory() {
  let story = createStory('Test')
  const startId = story.startNodeId!
  story = updateNode(story, startId, { title: 'Лесная тропа', text: 'Герой идёт через лес и видит волка.' })
  story = addChoice(story, startId, 'Подойти к волку')
  const choiceId = story.nodes[startId].choices[0].id
  story = updateChoiceText(story, startId, choiceId, 'Подойти к волку')
  return { story, startId, choiceId }
}

describe('findMatches', () => {
  it('returns no matches for a blank query', () => {
    const { story } = sampleStory()
    expect(findMatches(story, '')).toEqual([])
    expect(findMatches(story, '   ')).toEqual([])
  })

  it('finds a match in the node title', () => {
    const { story, startId } = sampleStory()
    const matches = findMatches(story, 'тропа')
    expect(matches).toEqual([{ nodeId: startId, field: 'title', snippet: 'Лесная тропа' }])
  })

  it('finds a match in the node text', () => {
    const { story, startId } = sampleStory()
    const matches = findMatches(story, 'волка')
    expect(matches.some((m) => m.nodeId === startId && m.field === 'text')).toBe(true)
  })

  it('finds a match in a choice and includes its choiceId', () => {
    const { story, startId, choiceId } = sampleStory()
    const matches = findMatches(story, 'Подойти')
    expect(matches).toContainEqual({ nodeId: startId, field: 'choice', choiceId, snippet: 'Подойти к волку' })
  })

  it('matches case-insensitively', () => {
    const { story } = sampleStory()
    expect(findMatches(story, 'ВОЛКА').length).toBeGreaterThan(0)
  })

  it('returns one match per field, even when the same node matches in title, text, and a choice', () => {
    const { story, startId } = sampleStory()
    const matches = findMatches(story, 'волк')
    const nodeMatches = matches.filter((m) => m.nodeId === startId)
    expect(nodeMatches.map((m) => m.field).sort()).toEqual(['choice', 'text'])
  })

  it('respects the caseSensitive option', () => {
    const { story } = sampleStory()
    expect(findMatches(story, 'ВОЛКА', { caseSensitive: true })).toEqual([])
    expect(findMatches(story, 'волка', { caseSensitive: true }).length).toBeGreaterThan(0)
  })

  it('respects the wholeWord option, excluding partial matches inside a longer word', () => {
    const { story, startId } = sampleStory()
    // "волк" is a substring of "волка" but not a whole word there.
    expect(findMatches(story, 'волк', { wholeWord: true })).toEqual([])
    expect(findMatches(story, 'волка', { wholeWord: true })).toContainEqual({
      nodeId: startId,
      field: 'text',
      snippet: 'Герой идёт через лес и видит волка.',
    })
  })

  it('matches a whole word at the start and end of a field, and combines wholeWord with caseSensitive', () => {
    const { story, startId } = sampleStory()
    expect(findMatches(story, 'Лесная', { wholeWord: true })).toContainEqual({
      nodeId: startId,
      field: 'title',
      snippet: 'Лесная тропа',
    })
    expect(findMatches(story, 'лесная', { wholeWord: true, caseSensitive: true })).toEqual([])
  })
})

describe('replaceAll', () => {
  it('returns the same story unchanged for a blank query', () => {
    const { story } = sampleStory()
    expect(replaceAll(story, '', 'x')).toBe(story)
  })

  it('replaces matches in the title, text, and choice text', () => {
    const { story, startId, choiceId } = sampleStory()
    const next = replaceAll(story, 'волк', 'медведь')
    expect(next.nodes[startId].text).toBe('Герой идёт через лес и видит медведьа.')
    expect(next.nodes[startId].choices.find((c) => c.id === choiceId)!.text).toBe('Подойти к медведьу')
  })

  it('replaces case-insensitively but keeps the replacement text\'s own casing', () => {
    const { story, startId } = sampleStory()
    const next = replaceAll(story, 'ТРОПА', 'дорога')
    expect(next.nodes[startId].title).toBe('Лесная дорога')
  })

  it('treats the query as a literal string, not a regular expression', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Вопрос?', text: 'Что (если) повезёт?' })
    const next = replaceAll(story, '(если)', '[если]')
    expect(next.nodes[startId].text).toBe('Что [если] повезёт?')
  })

  it('bumps updatedAt on a successful replace', () => {
    const { story } = sampleStory()
    const before = story.updatedAt
    const next = replaceAll(story, 'волк', 'медведь')
    expect(next.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('only replaces whole-word matches, leaving partial matches inside longer words untouched', () => {
    const { story, startId } = sampleStory()
    const next = replaceAll(story, 'волк', 'медведь', { wholeWord: true })
    // "волка" should be untouched since "волк" only matches it as a substring.
    expect(next.nodes[startId].text).toBe('Герой идёт через лес и видит волка.')
  })

  it('only replaces case-sensitive matches when caseSensitive is set', () => {
    const { story, startId } = sampleStory()
    const next = replaceAll(story, 'ТРОПА', 'дорога', { caseSensitive: true })
    expect(next.nodes[startId].title).toBe('Лесная тропа')
  })
})
