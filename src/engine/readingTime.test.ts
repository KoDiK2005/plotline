import { describe, expect, it } from 'vitest'
import { countWords, estimateReadingMinutes } from './readingTime'
import { addChoice, addNode, createStory, linkChoice, updateNode } from './storyOps'

describe('countWords', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })

  it('counts words separated by any amount of whitespace', () => {
    expect(countWords('один два   три\nчетыре')).toBe(4)
  })
})

describe('estimateReadingMinutes', () => {
  it('returns 1 minute for an empty or very short story', () => {
    const story = createStory('Empty')
    expect(estimateReadingMinutes(story)).toBe(1)
  })

  it('rounds total reachable word count to the nearest minute at 200 words/minute', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: Array(300).fill('слово').join(' ') })
    expect(estimateReadingMinutes(story)).toBe(2)
  })

  it('ignores text in nodes unreachable from the start', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'короткий старт' })
    const { story: s2, nodeId: orphanId } = addNode(story)
    story = s2
    story = updateNode(story, orphanId, { text: Array(1000).fill('слово').join(' ') })
    // orphanId is never linked from the start, so it should not count toward reading time.
    expect(estimateReadingMinutes(story)).toBe(1)
  })

  it('counts text from every node reachable via choices', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: Array(100).fill('слово').join(' ') })
    const { story: s2, nodeId: endId } = addNode(story)
    story = s2
    story = updateNode(story, endId, { text: Array(100).fill('слово').join(' ') })
    story = addChoice(story, startId, 'Дальше')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, endId)
    expect(estimateReadingMinutes(story)).toBe(1)
  })
})
