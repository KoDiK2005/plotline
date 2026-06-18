import { describe, expect, it } from 'vitest'
import { validateStory } from '../engine/validate'
import { getEndingNodeIds } from '../engine/traverse'
import { sampleStories } from './sampleStories'

describe('sampleStories', () => {
  it('ship at least two bundled stories', () => {
    expect(sampleStories.length).toBeGreaterThanOrEqual(2)
  })

  it.each(sampleStories.map((story) => [story.title, story] as const))(
    '"%s" has no validation errors and at least two endings',
    (_title, story) => {
      const issues = validateStory(story)
      const errors = issues.filter((issue) => issue.severity === 'error')
      expect(errors).toEqual([])
      expect(getEndingNodeIds(story).length).toBeGreaterThanOrEqual(2)
    },
  )

  it('have unique ids', () => {
    const ids = sampleStories.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
