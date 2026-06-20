import { describe, expect, it } from 'vitest'
import { computeAchievements } from './achievements'
import { addChoice, addNode, createStory, linkChoice } from './storyOps'
import type { Story } from '../types/story'

function unlocked(stories: Story[], progress: Parameters<typeof computeAchievements>[1] = {}) {
  return new Set(computeAchievements(stories, progress).filter((a) => a.unlocked).map((a) => a.id))
}

function endingsStory(title = 'Story') {
  let story = createStory(title)
  const startId = story.startNodeId!
  const { story: s2, nodeId: endA } = addNode(story)
  story = s2
  const { story: s3, nodeId: endB } = addNode(story)
  story = s3
  story = addChoice(story, startId, 'A')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, endA)
  story = addChoice(story, startId, 'B')
  story = linkChoice(story, startId, story.nodes[startId].choices[1].id, endB)
  return { story, startId, endA, endB }
}

describe('computeAchievements', () => {
  it('returns every achievement locked for an empty library', () => {
    const statuses = computeAchievements([], {})
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((a) => !a.unlocked)).toBe(true)
  })

  it('unlocks "first-steps" once any story has a discovered ending', () => {
    const { story, endA } = endingsStory()
    const result = unlocked([story], { [story.id]: { visitedNodeIds: [], discoveredEndingIds: [endA], playCount: 1 } })
    expect(result.has('first-steps')).toBe(true)
  })

  it('does not unlock "first-steps" with zero discovered endings', () => {
    const { story } = endingsStory()
    const result = unlocked([story], { [story.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 1 } })
    expect(result.has('first-steps')).toBe(false)
  })

  it('unlocks "collector" only once all endings of some story are found', () => {
    const { story, endA, endB } = endingsStory()
    const partial = unlocked([story], { [story.id]: { visitedNodeIds: [], discoveredEndingIds: [endA], playCount: 1 } })
    expect(partial.has('collector')).toBe(false)

    const full = unlocked([story], {
      [story.id]: { visitedNodeIds: [], discoveredEndingIds: [endA, endB], playCount: 1 },
    })
    expect(full.has('collector')).toBe(true)
  })

  it('unlocks "completionist" only once every story in the library is fully completed', () => {
    const { story: s1, endA: a1, endB: b1 } = endingsStory('One')
    const { story: s2, endA: a2 } = endingsStory('Two')

    const partial = unlocked([s1, s2], {
      [s1.id]: { visitedNodeIds: [], discoveredEndingIds: [a1, b1], playCount: 1 },
      [s2.id]: { visitedNodeIds: [], discoveredEndingIds: [a2], playCount: 1 },
    })
    expect(partial.has('completionist')).toBe(false)

    const full = unlocked([s1, s2], {
      [s1.id]: { visitedNodeIds: [], discoveredEndingIds: [a1, b1], playCount: 1 },
      [s2.id]: { visitedNodeIds: [], discoveredEndingIds: [a2, 'extra-id'], playCount: 1 },
    })
    expect(full.has('completionist')).toBe(true)
  })

  it('unlocks "author" only for a story whose id is not a built-in sample', () => {
    const sample = { ...createStory('Sample'), id: 'sample_demo' }
    const own = createStory('Mine')

    expect(unlocked([sample]).has('author')).toBe(false)
    expect(unlocked([own]).has('author')).toBe(true)
  })

  it('unlocks "architect" once a story reaches 10 scenes', () => {
    let story = createStory('Big')
    expect(unlocked([story]).has('architect')).toBe(false)

    for (let i = 0; i < 9; i++) {
      story = addNode(story).story
    }
    expect(Object.keys(story.nodes)).toHaveLength(10)
    expect(unlocked([story]).has('architect')).toBe(true)
  })

  it('unlocks "veteran" once total play count across stories reaches 10', () => {
    const story = createStory('Played')
    const below = unlocked([story], { [story.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 9 } })
    expect(below.has('veteran')).toBe(false)

    const atThreshold = unlocked([story], {
      [story.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 10 },
    })
    expect(atThreshold.has('veteran')).toBe(true)
  })

  it('unlocks "explorer" once total visited scenes across stories reaches 20', () => {
    const s1 = createStory('A')
    const s2 = createStory('B')
    const ids = Array.from({ length: 19 }, (_, i) => `node-${i}`)
    const below = unlocked([s1, s2], {
      [s1.id]: { visitedNodeIds: ids, discoveredEndingIds: [], playCount: 0 },
    })
    expect(below.has('explorer')).toBe(false)

    const atThreshold = unlocked([s1, s2], {
      [s1.id]: { visitedNodeIds: ids, discoveredEndingIds: [], playCount: 0 },
      [s2.id]: { visitedNodeIds: ['extra'], discoveredEndingIds: [], playCount: 0 },
    })
    expect(atThreshold.has('explorer')).toBe(true)
  })

  it('reports null progress for story-dependent achievements on an empty library', () => {
    const statuses = computeAchievements([], {})
    for (const id of ['collector', 'completionist', 'architect']) {
      expect(statuses.find((a) => a.id === id)!.progress).toBeNull()
    }
  })

  it('reports null progress once an achievement is unlocked, even if getProgress could compute a value', () => {
    const story = createStory('Played')
    const statuses = computeAchievements([story], {
      [story.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 10 },
    })
    const veteran = statuses.find((a) => a.id === 'veteran')!
    expect(veteran.unlocked).toBe(true)
    expect(veteran.progress).toBeNull()
  })

  it('reports current/target progress for "collector" using the story closest to completion', () => {
    const { story, endA } = endingsStory()
    const statuses = computeAchievements([story], {
      [story.id]: { visitedNodeIds: [], discoveredEndingIds: [endA], playCount: 1 },
    })
    expect(statuses.find((a) => a.id === 'collector')!.progress).toEqual({ current: 1, target: 2 })
  })

  it('reports current/target progress for "completionist" as count of fully-completed stories', () => {
    const { story: s1, endA: a1, endB: b1 } = endingsStory('One')
    const { story: s2 } = endingsStory('Two')
    const statuses = computeAchievements([s1, s2], {
      [s1.id]: { visitedNodeIds: [], discoveredEndingIds: [a1, b1], playCount: 1 },
    })
    expect(statuses.find((a) => a.id === 'completionist')!.progress).toEqual({ current: 1, target: 2 })
  })

  it('reports current/target progress for "architect" capped at the target', () => {
    let story = createStory('Big')
    for (let i = 0; i < 4; i++) {
      story = addNode(story).story
    }
    const statuses = computeAchievements([story], {})
    expect(statuses.find((a) => a.id === 'architect')!.progress).toEqual({ current: 5, target: 10 })
  })

  it('reports current/target progress for "veteran" and "explorer" while still locked', () => {
    const story = createStory('Played')
    const statuses = computeAchievements([story], {
      [story.id]: { visitedNodeIds: Array.from({ length: 15 }, (_, i) => `n${i}`), discoveredEndingIds: [], playCount: 4 },
    })
    expect(statuses.find((a) => a.id === 'veteran')!.progress).toEqual({ current: 4, target: 10 })
    expect(statuses.find((a) => a.id === 'explorer')!.progress).toEqual({ current: 15, target: 20 })
  })
})
