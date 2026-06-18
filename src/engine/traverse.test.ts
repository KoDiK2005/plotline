import { describe, expect, it } from 'vitest'
import { addChoice, addNode, createStory, linkChoice } from './storyOps'
import { autoLayoutPositions, getEndingNodeIds, getStoryStats, reachableDepths } from './traverse'

function linearStory() {
  let story = createStory()
  const startId = story.startNodeId!
  const { story: s2, nodeId: middleId } = addNode(story)
  story = s2
  const { story: s3, nodeId: endId } = addNode(story)
  story = s3

  story = addChoice(story, startId, 'Go on')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, middleId)
  story = addChoice(story, middleId, 'Finish')
  story = linkChoice(story, middleId, story.nodes[middleId].choices[0].id, endId)

  return { story, startId, middleId, endId }
}

describe('reachableDepths', () => {
  it('computes BFS distance from the start node', () => {
    const { story, startId, middleId, endId } = linearStory()
    const depths = reachableDepths(story)
    expect(depths.get(startId)).toBe(0)
    expect(depths.get(middleId)).toBe(1)
    expect(depths.get(endId)).toBe(2)
  })

  it('does not include nodes unreachable from the start', () => {
    let story = createStory()
    const { story: withOrphan } = addNode(story)
    story = withOrphan
    const depths = reachableDepths(story)
    expect(depths.size).toBe(1)
  })

  it('handles cycles without looping forever', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: s2, nodeId: otherId } = addNode(story)
    story = s2
    story = addChoice(story, startId, 'Loop')
    story = linkChoice(story, startId, story.nodes[startId].choices[0].id, otherId)
    story = addChoice(story, otherId, 'Back')
    story = linkChoice(story, otherId, story.nodes[otherId].choices[0].id, startId)

    const depths = reachableDepths(story)
    expect(depths.size).toBe(2)
  })
})

describe('getEndingNodeIds', () => {
  it('identifies nodes with no valid outgoing choices as endings', () => {
    const { story, endId } = linearStory()
    expect(getEndingNodeIds(story)).toEqual([endId])
  })
})

describe('getStoryStats', () => {
  it('summarizes a linear three-scene story', () => {
    const { story } = linearStory()
    const stats = getStoryStats(story)
    expect(stats.nodeCount).toBe(3)
    expect(stats.choiceCount).toBe(2)
    expect(stats.linkedChoiceCount).toBe(2)
    expect(stats.danglingChoiceCount).toBe(0)
    expect(stats.endingCount).toBe(1)
    expect(stats.maxDepth).toBe(2)
    expect(stats.unreachableCount).toBe(0)
  })

  it('counts dangling choices and unreachable nodes', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = addChoice(story, startId, 'Nowhere yet')
    const { story: withOrphan } = addNode(story)
    story = withOrphan

    const stats = getStoryStats(story)
    expect(stats.danglingChoiceCount).toBe(1)
    expect(stats.unreachableCount).toBe(1)
  })
})

describe('autoLayoutPositions', () => {
  it('places nodes left-to-right by BFS depth', () => {
    const { story, startId, middleId, endId } = linearStory()
    const positions = autoLayoutPositions(story)
    expect(positions[startId].x).toBeLessThan(positions[middleId].x)
    expect(positions[middleId].x).toBeLessThan(positions[endId].x)
  })

  it('places unreachable nodes in their own row below the graph', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withOrphan, nodeId: orphanId } = addNode(story)
    story = withOrphan

    const positions = autoLayoutPositions(story)
    expect(positions[orphanId].y).toBeGreaterThan(positions[startId].y)
  })
})
