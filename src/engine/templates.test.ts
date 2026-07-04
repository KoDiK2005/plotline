import { describe, expect, it } from 'vitest'
import { TEMPLATES, buildFromTemplate } from './templates'
import { validateStory } from './validate'
import { getStoryStats } from './traverse'

describe('templates', () => {
  it('exposes blank, mystery, and quest templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['blank', 'mystery', 'quest', 'dialogue'])
  })

  it('builds a blank story with a single empty start node', () => {
    const story = buildFromTemplate('blank', 'My Story')
    expect(story.title).toBe('My Story')
    expect(Object.keys(story.nodes)).toHaveLength(1)
    expect(story.startNodeId).not.toBeNull()
  })

  it('builds a mystery story with four fully linked scenes and no validation issues', () => {
    const story = buildFromTemplate('mystery', 'Whodunit')
    expect(Object.keys(story.nodes)).toHaveLength(4)
    expect(validateStory(story)).toHaveLength(0)
    expect(getStoryStats(story).endingCount).toBe(1)
  })

  it('builds a quest story with five scenes, two endings, and no validation issues', () => {
    const story = buildFromTemplate('quest', 'Hero Journey')
    expect(Object.keys(story.nodes)).toHaveLength(5)
    expect(validateStory(story)).toHaveLength(0)
    expect(getStoryStats(story).endingCount).toBe(2)
  })

  it('falls back to the blank template for an unrecognized id', () => {
    // @ts-expect-error -- intentionally passing an invalid id to test the fallback
    const story = buildFromTemplate('not-a-real-template', 'Fallback')
    expect(Object.keys(story.nodes)).toHaveLength(1)
  })

  it('generates fresh ids on every call so two stories never collide', () => {
    const a = buildFromTemplate('mystery', 'A')
    const b = buildFromTemplate('mystery', 'B')
    expect(a.id).not.toBe(b.id)
    expect(Object.keys(a.nodes)).not.toEqual(Object.keys(b.nodes))
  })
})
