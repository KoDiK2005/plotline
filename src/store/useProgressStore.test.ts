import { beforeEach, describe, expect, it } from 'vitest'
import { useProgressStore, type StoryProgress } from './useProgressStore'

describe('useProgressStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.persist.clearStorage()
    useProgressStore.setState({ progress: {} })
  })

  it('records a visited node once, ignoring repeats', () => {
    const { recordVisit, getProgress } = useProgressStore.getState()
    recordVisit('story-1', 'node-a')
    recordVisit('story-1', 'node-a')
    recordVisit('story-1', 'node-b')

    expect(getProgress('story-1').visitedNodeIds).toEqual(['node-a', 'node-b'])
  })

  it('records a visited choice once, ignoring repeats', () => {
    const { recordChoice, getProgress } = useProgressStore.getState()
    recordChoice('story-1', 'choice-a')
    recordChoice('story-1', 'choice-a')
    recordChoice('story-1', 'choice-b')

    expect(getProgress('story-1').visitedChoiceIds).toEqual(['choice-a', 'choice-b'])
  })

  it('keeps visited choices independent across stories', () => {
    const { recordChoice, getProgress } = useProgressStore.getState()
    recordChoice('story-1', 'choice-a')
    recordChoice('story-2', 'choice-b')

    expect(getProgress('story-1').visitedChoiceIds).toEqual(['choice-a'])
    expect(getProgress('story-2').visitedChoiceIds).toEqual(['choice-b'])
  })

  it('returns an empty default progress for a story with no recorded activity', () => {
    expect(useProgressStore.getState().getProgress('unknown-story')).toEqual({
      visitedNodeIds: [],
      visitedChoiceIds: [],
      discoveredEndingIds: [],
      playCount: 0,
      lastPlayedAt: 0,
      savedPlay: null,
    })
  })

  it('backfills missing fields on legacy progress records instead of throwing', () => {
    // Simulates persisted data from before visitedChoiceIds/savedPlay existed.
    const legacyProgress = {
      visitedNodeIds: ['node-a'],
      discoveredEndingIds: [],
      playCount: 1,
      lastPlayedAt: 123,
    } as unknown as StoryProgress
    useProgressStore.setState({ progress: { 'story-1': legacyProgress } })

    const { recordChoice, getProgress } = useProgressStore.getState()
    expect(() => recordChoice('story-1', 'choice-a')).not.toThrow()
    expect(getProgress('story-1').visitedChoiceIds).toEqual(['choice-a'])
    expect(getProgress('story-1').visitedNodeIds).toEqual(['node-a'])
  })

  it('clears all progress fields for a story, including visited choices', () => {
    const { recordVisit, recordChoice, recordEnding, clearProgress, getProgress } = useProgressStore.getState()
    recordVisit('story-1', 'node-a')
    recordChoice('story-1', 'choice-a')
    recordEnding('story-1', 'node-a')

    clearProgress('story-1')

    expect(getProgress('story-1')).toEqual({
      visitedNodeIds: [],
      visitedChoiceIds: [],
      discoveredEndingIds: [],
      playCount: 0,
      lastPlayedAt: 0,
      savedPlay: null,
    })
  })
})
