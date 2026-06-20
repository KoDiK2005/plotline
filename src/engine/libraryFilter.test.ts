import { describe, expect, it } from 'vitest'
import { filterStories } from './libraryFilter'
import { addChoice, addNode, createStory, linkChoice } from './storyOps'
import type { Story } from '../types/story'

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

function names(stories: Story[]): string[] {
  return stories.map((s) => s.title)
}

describe('filterStories', () => {
  it('returns every story unchanged for the "all" filter', () => {
    const { story } = endingsStory('A')
    expect(names(filterStories([story], {}, 'all'))).toEqual(['A'])
  })

  it('"unstarted" keeps only stories with no recorded play count', () => {
    const { story: never } = endingsStory('Never played')
    const { story: played } = endingsStory('Played')
    const progress = { [played.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 1 } }

    expect(names(filterStories([never, played], progress, 'unstarted'))).toEqual(['Never played'])
  })

  it('"completed" keeps only stories where every ending has been discovered', () => {
    const { story: partial, endA } = endingsStory('Partial')
    const { story: full, endA: fa, endB: fb } = endingsStory('Full')
    const progress = {
      [partial.id]: { visitedNodeIds: [], discoveredEndingIds: [endA], playCount: 1 },
      [full.id]: { visitedNodeIds: [], discoveredEndingIds: [fa, fb], playCount: 1 },
    }

    expect(names(filterStories([partial, full], progress, 'completed'))).toEqual(['Full'])
  })

  it('"in-progress" keeps stories that have been played but not fully completed', () => {
    const { story: never } = endingsStory('Never played')
    const { story: partial, endA } = endingsStory('Partial')
    const { story: full, endA: fa, endB: fb } = endingsStory('Full')
    const progress = {
      [partial.id]: { visitedNodeIds: [], discoveredEndingIds: [endA], playCount: 1 },
      [full.id]: { visitedNodeIds: [], discoveredEndingIds: [fa, fb], playCount: 1 },
    }

    expect(names(filterStories([never, partial, full], progress, 'in-progress'))).toEqual(['Partial'])
  })

  it('a story with zero endings is never "completed", even after being played', () => {
    const story = createStory('No endings reachable, but has a choice')
    const progress = { [story.id]: { visitedNodeIds: [], discoveredEndingIds: [], playCount: 3 } }

    expect(filterStories([story], progress, 'completed')).toEqual([])
    expect(names(filterStories([story], progress, 'in-progress'))).toEqual([story.title])
  })
})
